/**
 * One-time script to backfill thumbnailUrl on existing plants
 * that have photos in blob storage but no thumbnail set.
 *
 * Usage: node scripts/backfill-thumbnails.js
 * Requires: AZURE_APP_CONFIG_ENDPOINT, APP_CONFIG_PREFIX in .env
 */
import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { fetchAppConfig } from '../startup/appConfig.js';

const config = await fetchAppConfig();
const credential = new DefaultAzureCredential();

const cosmos = new CosmosClient({ endpoint: config.cosmosDbEndpoint, aadCredentials: credential });
const plantsContainer = cosmos.database('PlantAgentDB').container('plants');

const blobService = new BlobServiceClient(config.storageAccountEndpoint, credential);
const photosContainer = blobService.getContainerClient('photos');

const { resources: plants } = await plantsContainer.items.query('SELECT * FROM c').fetchAll();

let updated = 0;
for (const plant of plants) {
  if (plant.thumbnailUrl) {
    console.log(`SKIP ${plant.name} — already has thumbnail`);
    continue;
  }

  const prefix = `${plant.slug || plant.id}/`;
  let firstPhotoUrl = null;
  for await (const blob of photosContainer.listBlobsFlat({ prefix })) {
    firstPhotoUrl = `${config.storageAccountEndpoint}photos/${blob.name}`;
    break;
  }

  if (firstPhotoUrl) {
    plant.thumbnailUrl = firstPhotoUrl;
    plant.updatedAt = new Date().toISOString();
    await plantsContainer.items.upsert(plant);
    console.log(`SET  ${plant.name} → ${firstPhotoUrl}`);
    updated++;
  } else {
    console.log(`SKIP ${plant.name} — no photos`);
  }
}

console.log(`\nDone. Updated ${updated} plant(s).`);
