// SQLite snapshot query layer — mirrors the backend's public API response shapes.
//
// Each function takes an open sql.js database and returns data in the same
// format as the corresponding API endpoint, so components can use either
// source transparently via useDataSource().

import type { Database, SqlValue } from 'sql.js';
import type { Plant, PlantEvent, Analysis, Chat, Task } from '../types';
import type { Photo } from '../hooks/usePhotos';

// Helper: run a query and map rows using column names
function queryAll<T>(db: Database, sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function getPlants(db: Database): Plant[] {
  const rows = queryAll<Record<string, unknown>>(db, 'SELECT * FROM plants ORDER BY name');
  return rows.map(mapPlant);
}

export function getPlant(db: Database, id: string): Plant | null {
  const rows = queryAll<Record<string, unknown>>(db, 'SELECT * FROM plants WHERE id = ?', [id]);
  return rows.length > 0 ? mapPlant(rows[0]) : null;
}

export function getEvents(db: Database, plantId: string): PlantEvent[] {
  const rows = queryAll<Record<string, unknown>>(
    db,
    'SELECT * FROM events WHERE plant_id = ? ORDER BY date DESC',
    [plantId],
  );
  return rows.map((r) => ({
    id: r.id as string,
    plantId: r.plant_id as string,
    type: r.type as PlantEvent['type'],
    notes: (r.notes as string) || '',
    date: (r.date as string) || '',
    userId: '',
    createdAt: (r.created_at as string) || '',
  }));
}

export function getPhotos(db: Database, plantId: string): Photo[] {
  const rows = queryAll<Record<string, unknown>>(
    db,
    'SELECT * FROM photos WHERE plant_id = ? ORDER BY created_at DESC',
    [plantId],
  );
  return rows.map((r) => ({
    name: r.name as string,
    url: r.url as string,
    createdAt: (r.created_at as string) || '',
  }));
}

export function getAnalyses(db: Database): Analysis[] {
  const rows = queryAll<Record<string, unknown>>(db, 'SELECT * FROM analyses ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id as string,
    plantId: r.plant_id as string,
    date: (r.date as string) || '',
    findings: (r.findings as string) || '',
    recommendations: r.recommendations ? JSON.parse(r.recommendations as string) : [],
    photosUsed: r.photos_used ? JSON.parse(r.photos_used as string) : [],
    model: (r.model as string) || '',
    createdAt: (r.created_at as string) || '',
  }));
}

export function getChats(db: Database, plantId: string): Chat[] {
  const rows = queryAll<Record<string, unknown>>(
    db,
    'SELECT * FROM chats WHERE plant_id = ? ORDER BY created_at DESC',
    [plantId],
  );
  return rows.map((r) => ({
    id: r.id as string,
    plantId: r.plant_id as string,
    userMessage: (r.user_message as string) || '',
    assistantMessage: (r.assistant_message as string) || '',
    userId: '',
    createdAt: (r.created_at as string) || '',
  }));
}

export function getTasks(db: Database): Task[] {
  const rows = queryAll<Record<string, unknown>>(db, 'SELECT * FROM tasks');
  return rows.map((r) => ({
    plantId: r.plant_id as string,
    plantName: (r.plant_name as string) || '',
    action: r.action as string,
    daysSinceLast: r.days_since_last != null ? (r.days_since_last as number) : Infinity,
    urgency: (r.urgency as Task['urgency']) || 'low',
  }));
}

function mapPlant(r: Record<string, unknown>): Plant {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: (r.slug as string) || '',
    room: (r.room as string) || '',
    species: (r.species as string) || '',
    position: (r.position as string) || '',
    notes: (r.notes as string) || '',
    claudeNotes: (r.claude_notes as string) || '',
    thumbnailUrl: (r.thumbnail_url as string) || undefined,
    createdAt: (r.created_at as string) || '',
    updatedAt: (r.updated_at as string) || '',
  };
}
