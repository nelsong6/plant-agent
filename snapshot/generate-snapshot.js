// Generates a SQLite snapshot of public Cosmos DB data for static frontend serving.
//
// Connects to Cosmos DB and Azure Blob Storage via Azure identity, queries all
// public data (plants, events, photos, analyses, chats, tasks), and writes them
// into a SQLite file that the frontend loads via sql.js (WASM).
//
// Environment variables:
//   AZURE_APP_CONFIG_ENDPOINT  - Azure App Configuration endpoint
//   APP_CONFIG_PREFIX          - App Config key prefix (e.g. "plants")
//   COSMOS_DB_ENDPOINT         - Direct Cosmos DB endpoint (skips App Config lookup)
//   STORAGE_ACCOUNT_ENDPOINT   - Direct blob storage endpoint (skips App Config lookup)
//   COSMOS_DB_DATABASE_NAME    - Database name (default: PlantAgentDB)
//   OUTPUT_PATH                - Output .db file path (default: ../frontend/public/snapshot.db)

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { AppConfigurationClient } from '@azure/app-configuration';
import { BlobServiceClient } from '@azure/storage-blob';
import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default care intervals (mirrors backend/routes/tasks.js)
const DEFAULT_INTERVALS = {
  watered: 7,
  fertilized: 30,
  repotted: 365,
  pruned: 90,
};

function computeUrgency(daysSince, interval) {
  const ratio = daysSince / interval;
  if (ratio >= 1.5) return 'high';
  if (ratio >= 1.0) return 'medium';
  return 'low';
}

function getOutputPath() {
  const idx = process.argv.indexOf('--output');
  if (idx !== -1 && process.argv[idx + 1]) {
    return resolve(process.argv[idx + 1]);
  }
  return resolve(process.env.OUTPUT_PATH || `${__dirname}/../frontend/public/snapshot.db`);
}

// Resolve config values from env vars directly or via App Configuration
async function getConfig(credential) {
  let cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
  let storageEndpoint = process.env.STORAGE_ACCOUNT_ENDPOINT;

  if (!cosmosEndpoint || !storageEndpoint) {
    const appConfigEndpoint = process.env.AZURE_APP_CONFIG_ENDPOINT;
    const prefix = process.env.APP_CONFIG_PREFIX;
    if (!appConfigEndpoint || !prefix) {
      throw new Error('Set COSMOS_DB_ENDPOINT + STORAGE_ACCOUNT_ENDPOINT, or AZURE_APP_CONFIG_ENDPOINT + APP_CONFIG_PREFIX');
    }

    const client = new AppConfigurationClient(appConfigEndpoint, credential);
    const [cosmosSetting, storageSetting] = await Promise.all([
      client.getConfigurationSetting({ key: `${prefix}/cosmos_db_endpoint` }),
      client.getConfigurationSetting({ key: `${prefix}/storage_account_endpoint` }),
    ]);
    cosmosEndpoint = cosmosEndpoint || cosmosSetting.value;
    storageEndpoint = storageEndpoint || storageSetting.value;
  }

  return { cosmosEndpoint, storageEndpoint };
}

// Schema DDL — mirrors the public data from Cosmos DB + Blob Storage
const SCHEMA = `
  CREATE TABLE plants (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    slug            TEXT,
    room            TEXT,
    species         TEXT,
    position        TEXT,
    notes           TEXT,
    claude_notes    TEXT,
    thumbnail_url   TEXT,
    care_schedule   TEXT,
    created_at      TEXT,
    updated_at      TEXT
  );

  CREATE TABLE events (
    id          TEXT PRIMARY KEY,
    plant_id    TEXT NOT NULL,
    type        TEXT NOT NULL,
    notes       TEXT,
    date        TEXT,
    created_at  TEXT
  );
  CREATE INDEX idx_events_plant ON events(plant_id);
  CREATE INDEX idx_events_date ON events(date DESC);

  CREATE TABLE photos (
    plant_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    url         TEXT NOT NULL,
    created_at  TEXT
  );
  CREATE INDEX idx_photos_plant ON photos(plant_id);

  CREATE TABLE analyses (
    id              TEXT PRIMARY KEY,
    plant_id        TEXT NOT NULL,
    date            TEXT,
    findings        TEXT,
    recommendations TEXT,
    photos_used     TEXT,
    model           TEXT,
    created_at      TEXT
  );
  CREATE INDEX idx_analyses_plant ON analyses(plant_id);

  CREATE TABLE chats (
    id                TEXT PRIMARY KEY,
    plant_id          TEXT NOT NULL,
    user_message      TEXT,
    assistant_message TEXT,
    created_at        TEXT
  );
  CREATE INDEX idx_chats_plant ON chats(plant_id);

  CREATE TABLE tasks (
    plant_id        TEXT NOT NULL,
    plant_name      TEXT,
    room            TEXT,
    action          TEXT NOT NULL,
    interval_days   INTEGER,
    days_since_last INTEGER,
    last_date       TEXT,
    urgency         TEXT
  );

  CREATE TABLE snapshot_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

// List all photo blobs for a plant from Azure Blob Storage
async function listPlantPhotos(containerClient, plant) {
  const prefix = `${plant.slug || plant.id}/`;
  const photos = [];
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    photos.push({
      plantId: plant.id,
      name: blob.name,
      url: `${containerClient.url}/${blob.name}`,
      createdAt: blob.properties.createdOn?.toISOString() || null,
    });
  }
  photos.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return photos;
}

// Compute care tasks from plants + events (mirrors backend/routes/tasks.js)
function computeTasks(plants, allEvents) {
  const now = Date.now();
  const tasks = [];

  for (const plant of plants) {
    const plantEvents = allEvents
      .filter((e) => e.plantId === plant.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const intervals = { ...DEFAULT_INTERVALS, ...plant.careSchedule };

    for (const [careType, intervalDays] of Object.entries(intervals)) {
      const lastEvent = plantEvents.find((e) => e.type === careType);
      const daysSince = lastEvent
        ? Math.floor((now - new Date(lastEvent.date).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      if (daysSince >= intervalDays * 0.8) {
        tasks.push({
          plantId: plant.id,
          plantName: plant.name,
          room: plant.room || null,
          action: careType,
          intervalDays,
          daysSinceLast: daysSince === Infinity ? null : daysSince,
          lastDate: lastEvent?.date || null,
          urgency: daysSince === Infinity ? 'high' : computeUrgency(daysSince, intervalDays),
        });
      }
    }
  }

  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  return tasks;
}

async function main() {
  const outputPath = getOutputPath();
  console.log(`Output: ${outputPath}`);

  const credential = new DefaultAzureCredential();
  const { cosmosEndpoint, storageEndpoint } = await getConfig(credential);
  console.log(`Cosmos DB: ${cosmosEndpoint}`);
  console.log(`Storage:   ${storageEndpoint}`);

  // Cosmos DB setup
  const cosmosClient = new CosmosClient({ endpoint: cosmosEndpoint, aadCredentials: credential });
  const databaseName = process.env.COSMOS_DB_DATABASE_NAME || 'PlantAgentDB';
  const database = cosmosClient.database(databaseName);

  const plantsContainer = database.container('plants');
  const eventsContainer = database.container('events');
  const analysesContainer = database.container('analyses');
  const chatsContainer = database.container('chats');

  // Blob Storage setup
  const blobService = new BlobServiceClient(storageEndpoint, credential);
  const photosContainerClient = blobService.getContainerClient('photos');

  // Query all Cosmos containers
  console.log('Querying Cosmos DB...');
  const queries = {
    plants: { container: plantsContainer, query: 'SELECT * FROM c' },
    events: { container: eventsContainer, query: 'SELECT * FROM c ORDER BY c.date DESC' },
    analyses: { container: analysesContainer, query: 'SELECT * FROM c ORDER BY c.createdAt DESC' },
    chats: { container: chatsContainer, query: 'SELECT * FROM c ORDER BY c.createdAt DESC' },
  };

  const results = {};
  for (const [key, { container, query }] of Object.entries(queries)) {
    const { resources } = await container.items.query(query).fetchAll();
    results[key] = resources;
    console.log(`  ${key}: ${resources.length} documents`);
  }

  // List photos from Blob Storage
  console.log('Listing photos from Blob Storage...');
  const allPhotos = [];
  for (const plant of results.plants) {
    const photos = await listPlantPhotos(photosContainerClient, plant);
    allPhotos.push(...photos);
  }
  console.log(`  photos: ${allPhotos.length} blobs`);

  // Compute tasks
  const tasks = computeTasks(results.plants, results.events);
  console.log(`  tasks: ${tasks.length} computed`);

  // Build SQLite database
  const db = new Database(outputPath);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = OFF');

  db.exec(SCHEMA);

  const insertAll = db.transaction(() => {
    // Plants
    const insertPlant = db.prepare(
      'INSERT INTO plants (id, name, slug, room, species, position, notes, claude_notes, thumbnail_url, care_schedule, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const doc of results.plants) {
      insertPlant.run(
        doc.id, doc.name, doc.slug || null, doc.room || null,
        doc.species || null, doc.position || null, doc.notes || null,
        doc.claudeNotes || null, doc.thumbnailUrl || null,
        doc.careSchedule ? JSON.stringify(doc.careSchedule) : null,
        doc.createdAt || null, doc.updatedAt || null,
      );
    }

    // Events
    const insertEvent = db.prepare(
      'INSERT INTO events (id, plant_id, type, notes, date, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const doc of results.events) {
      insertEvent.run(doc.id, doc.plantId, doc.type, doc.notes || null, doc.date || null, doc.createdAt || null);
    }

    // Photos
    const insertPhoto = db.prepare(
      'INSERT INTO photos (plant_id, name, url, created_at) VALUES (?, ?, ?, ?)'
    );
    for (const photo of allPhotos) {
      insertPhoto.run(photo.plantId, photo.name, photo.url, photo.createdAt);
    }

    // Analyses
    const insertAnalysis = db.prepare(
      'INSERT INTO analyses (id, plant_id, date, findings, recommendations, photos_used, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const doc of results.analyses) {
      insertAnalysis.run(
        doc.id, doc.plantId, doc.date || null, doc.findings || null,
        doc.recommendations ? JSON.stringify(doc.recommendations) : null,
        doc.photosUsed ? JSON.stringify(doc.photosUsed) : null,
        doc.model || null, doc.createdAt || null,
      );
    }

    // Chats
    const insertChat = db.prepare(
      'INSERT INTO chats (id, plant_id, user_message, assistant_message, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    for (const doc of results.chats) {
      insertChat.run(doc.id, doc.plantId, doc.userMessage || null, doc.assistantMessage || null, doc.createdAt || null);
    }

    // Tasks (pre-computed)
    const insertTask = db.prepare(
      'INSERT INTO tasks (plant_id, plant_name, room, action, interval_days, days_since_last, last_date, urgency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const task of tasks) {
      insertTask.run(
        task.plantId, task.plantName, task.room, task.action,
        task.intervalDays, task.daysSinceLast, task.lastDate, task.urgency,
      );
    }

    // Snapshot metadata
    const insertMeta = db.prepare('INSERT INTO snapshot_meta (key, value) VALUES (?, ?)');
    insertMeta.run('generated_at', new Date().toISOString());
  });

  insertAll();
  db.close();

  console.log(`Snapshot written to ${outputPath}`);
}

main().catch((err) => {
  console.error('Snapshot generation failed:', err);
  process.exit(1);
});
