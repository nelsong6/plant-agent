import { useCallback, useEffect, useState } from 'react';
import type { Chat } from '../types';
import { fetchChats } from '../api/chats';

export function useChats(plantId: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchChats(plantId)
      .then(setChats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [plantId]);

  useEffect(load, [load]);

  function addChat(chat: Chat) {
    setChats((prev) => [chat, ...prev]);
  }

  return { chats, loading, addChat, refetch: load };
}
