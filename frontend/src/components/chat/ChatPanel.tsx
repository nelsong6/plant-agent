import { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useChats } from '../../hooks/useChats';
import type { Chat } from '../../types';
import { Button } from '../ui/Button';

interface Props {
  plantId: string;
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="w-1.5 h-1.5 bg-bark-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-bark-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-bark-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

function ChatCard({ chat, defaultExpanded }: { chat: Chat; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const date = new Date(chat.createdAt);

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left border border-bark-200 dark:border-bark-600 rounded-lg p-3 hover:bg-bark-50 dark:hover:bg-bark-750 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-bark-800 dark:text-bark-100 truncate flex-1">
          {chat.userMessage}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-bark-400 dark:text-bark-500">
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <span className={`text-bark-400 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-bark-100 dark:border-bark-700">
          <p className="text-sm text-bark-600 dark:text-bark-300 whitespace-pre-wrap">
            {chat.assistantMessage}
          </p>
        </div>
      )}
    </button>
  );
}

export function ChatPanel({ plantId }: Props) {
  const { chats, loading: chatsLoading, addChat } = useChats(plantId);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [activeResponse, setActiveResponse] = useState<{ userMessage: string; assistantMessage: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeResponse?.assistantMessage]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    setStreaming(true);
    setActiveResponse({ userMessage: text, assistantMessage: '' });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/plants/${plantId}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Chat failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let buffer = '';
      let chatSaved = false;

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        const data = JSON.parse(line.slice(6));

        if (data.type === 'text') {
          setActiveResponse((prev) =>
            prev ? { ...prev, assistantMessage: prev.assistantMessage + data.text } : prev
          );
        } else if (data.type === 'done' && data.chat) {
          addChat(data.chat as Chat);
          chatSaved = true;
        } else if (data.type === 'error') {
          setActiveResponse((prev) =>
            prev ? { ...prev, assistantMessage: `Error: ${data.error}` } : prev
          );
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) processLine(line);
      }

      if (buffer.trim()) processLine(buffer.trim());

      if (chatSaved) {
        setActiveResponse(null);
      }
    } catch (e) {
      setActiveResponse((prev) =>
        prev ? { ...prev, assistantMessage: `Error: ${e instanceof Error ? e.message : 'Chat failed'}` } : prev
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* New question input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about this plant..."
          disabled={streaming}
          className="flex-1 rounded-lg border border-bark-200 dark:border-bark-600 bg-white dark:bg-bark-700 text-bark-800 dark:text-bark-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 disabled:opacity-50"
        />
        <Button
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          size="sm"
        >
          Send
        </Button>
      </div>

      {/* Active streaming response */}
      {activeResponse && (
        <div className="border border-bark-200 dark:border-bark-600 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-bark-800 dark:text-bark-100">{activeResponse.userMessage}</p>
          <div className="text-sm text-bark-600 dark:text-bark-300 whitespace-pre-wrap">
            {activeResponse.assistantMessage || <StreamingDots />}
          </div>
          <div ref={scrollRef} />
        </div>
      )}

      {/* Chat history */}
      {chatsLoading ? (
        <p className="text-bark-400 text-sm">Loading chats...</p>
      ) : chats.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-bark-400 dark:text-bark-500 uppercase tracking-wide">Previous chats</p>
          {chats.map((chat, i) => (
            <ChatCard key={chat.id} chat={chat} defaultExpanded={i === 0 && !activeResponse} />
          ))}
        </div>
      ) : !activeResponse ? (
        <p className="text-bark-400 text-sm text-center py-4">Ask a question about this plant...</p>
      ) : null}
    </div>
  );
}
