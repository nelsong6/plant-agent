import { useCallback, useEffect, useState } from 'react';
import type { Chat } from '../types';
import { useDataSource } from '../api/snapshotContext';

export function useChats(plantId: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchChats, isReady } = useDataSource();

  const load = useCallback(() => {
    if (!isReady) return;
    setLoading(true);
    fetchChats(plantId)
      .then(setChats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [plantId, isReady]);

  useEffect(load, [load]);

  function addChat(chat: Chat) {
    setChats((prev) => [chat, ...prev]);
  }

  return { chats, loading, addChat, refetch: load };
}
