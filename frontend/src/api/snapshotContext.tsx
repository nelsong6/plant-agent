// Snapshot data layer — loads a SQLite snapshot for anonymous visitors.
//
// When no auth token is present, fetches /snapshot.db and opens it with sql.js
// (SQLite compiled to WASM). Provides a useDataSource() hook that routes reads
// to either the local snapshot or the live API depending on auth state.
//
// If the snapshot is missing (404) or fails to load, falls back to live API.

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from './client';
import { fetchPlants, fetchPlant } from './plants';
import { fetchEvents } from './events';
import { fetchChats } from './chats';
import {
  getPlants,
  getPlant,
  getEvents,
  getPhotos,
  getAnalyses,
  getChats,
  getTasks,
} from './snapshot';
import type { Database } from 'sql.js';
import type { Plant, PlantEvent, Analysis, Chat, Task } from '../types';
import type { Photo } from '../hooks/usePhotos';

interface SnapshotState {
  db: Database | null;
  loading: boolean;
}

const SnapshotContext = createContext<SnapshotState | null>(null);

async function loadSnapshot(): Promise<Database | null> {
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });

  const response = await fetch('/snapshot.db');
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  return new SQL.Database(new Uint8Array(buffer));
}

export function SnapshotProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(!token);
  const loadAttempted = useRef(false);

  useEffect(() => {
    if (token || loadAttempted.current) {
      setLoading(false);
      return;
    }
    loadAttempted.current = true;

    loadSnapshot()
      .then((database) => setDb(database))
      .catch((err) => console.warn('Snapshot load failed, using live API:', err))
      .finally(() => setLoading(false));
  }, [token]);

  // Discard snapshot when user authenticates — switch to live API
  useEffect(() => {
    if (token && db) {
      db.close();
      setDb(null);
    }
  }, [token]);

  return (
    <SnapshotContext.Provider value={{ db, loading }}>
      {children}
    </SnapshotContext.Provider>
  );
}

export function useSnapshot() {
  const ctx = useContext(SnapshotContext);
  if (!ctx) throw new Error('useSnapshot must be used within SnapshotProvider');
  return ctx;
}

// Unified data source hook — routes reads to snapshot or live API.
// Write operations always go through apiFetch/live API regardless.
export function useDataSource() {
  const { token } = useAuth();
  const { db, loading: snapshotLoading } = useSnapshot();

  const isLive = !!token || !db;
  const isReady = !snapshotLoading;

  async function dsPlants(): Promise<Plant[]> {
    if (isLive) return fetchPlants();
    return getPlants(db!);
  }

  async function dsPlant(id: string): Promise<Plant | null> {
    if (isLive) return fetchPlant(id);
    return getPlant(db!, id);
  }

  async function dsEvents(plantId: string): Promise<PlantEvent[]> {
    if (isLive) return fetchEvents(plantId);
    return getEvents(db!, plantId);
  }

  async function dsPhotos(plantId: string): Promise<Photo[]> {
    if (isLive) return apiFetch<Photo[]>(`/api/plants/${plantId}/photos`);
    return getPhotos(db!, plantId);
  }

  async function dsAnalyses(): Promise<Analysis[]> {
    if (isLive) return apiFetch<Analysis[]>('/api/analysis');
    return getAnalyses(db!);
  }

  async function dsChats(plantId: string): Promise<Chat[]> {
    if (isLive) return fetchChats(plantId);
    return getChats(db!, plantId);
  }

  async function dsTasks(): Promise<Task[]> {
    if (isLive) return apiFetch<Task[]>('/api/tasks');
    return getTasks(db!);
  }

  return {
    fetchPlants: dsPlants,
    fetchPlant: dsPlant,
    fetchEvents: dsEvents,
    fetchPhotos: dsPhotos,
    fetchAnalyses: dsAnalyses,
    fetchChats: dsChats,
    fetchTasks: dsTasks,
    isLive,
    isReady,
  };
}
