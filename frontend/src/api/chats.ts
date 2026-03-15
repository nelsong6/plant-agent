import type { Chat } from '../types';
import { apiFetch } from './client';

export function fetchChats(plantId: string): Promise<Chat[]> {
  return apiFetch(`/api/plants/${plantId}/chats`);
}
