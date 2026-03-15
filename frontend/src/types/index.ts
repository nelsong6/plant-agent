export interface Plant {
  id: string;
  name: string;
  slug: string;
  room: string;
  species: string;
  position: string;
  notes: string;
  claudeNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type EventType = 'watered' | 'fertilized' | 'repotted' | 'pruned' | 'analysis' | 'note';

export interface PlantEvent {
  id: string;
  plantId: string;
  type: EventType;
  notes: string;
  date: string;
  userId: string;
  createdAt: string;
}

export interface Analysis {
  id: string;
  plantId: string;
  date: string;
  findings: string;
  recommendations: string[];
  photosUsed: string[];
  model: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  referencePhotoUrl: string;
  plantCoordinateMap: { plantId: string; x: number; y: number }[];
}

export interface Task {
  plantId: string;
  plantName: string;
  action: string;
  daysSinceLast: number;
  urgency: 'low' | 'medium' | 'high';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}
