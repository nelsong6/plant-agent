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

function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          role === 'user'
            ? 'bg-leaf-500 text-white rounded-2xl rounded-br-sm'
            : 'bg-bark-100 dark:bg-bark-700 text-bark-800 dark:text-bark-100 rounded-2xl rounded-bl-sm'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function ChatHistory({ chats }: { chats: Chat[] }) {
  if (chats.length === 0) return null;

  return (
    <div className="space-y-4">
      {chats.map((chat) => (
        <div key={chat.id} className="space-y-2">
          <p className="text-xs text-bark-400 dark:text-bark-500">
            {new Date(chat.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            {new Date(chat.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </p>
          <ChatBubble role="user" content={chat.userMessage} />
          <ChatBubble role="assistant" content={chat.assistantMessage} />
        </div>
      ))}
    </div>
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
  }, [activeResponse?.assistantMessage, chats]);

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
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'text') {
            setActiveResponse((prev) =>
              prev ? { ...prev, assistantMessage: prev.assistantMessage + data.text } : prev
            );
          } else if (data.type === 'done' && data.chat) {
            addChat(data.chat as Chat);
          } else if (data.type === 'error') {
            setActiveResponse((prev) =>
              prev ? { ...prev, assistantMessage: `Error: ${data.error}` } : prev
            );
          }
        }
      }
    } catch (e) {
      setActiveResponse((prev) =>
        prev ? { ...prev, assistantMessage: `Error: ${e instanceof Error ? e.message : 'Chat failed'}` } : prev
      );
    } finally {
      setStreaming(false);
      setActiveResponse(null);
    }
  }

  return (
    <div className="border border-bark-100 dark:border-bark-700 rounded-xl overflow-hidden">
      {/* Chat history + active response */}
      <div className="h-80 overflow-y-auto p-4 space-y-4">
        {chatsLoading ? (
          <p className="text-bark-400 text-center mt-20 text-sm">Loading chats...</p>
        ) : chats.length === 0 && !activeResponse ? (
          <p className="text-bark-400 text-center mt-20 text-sm">
            Ask a question about this plant...
          </p>
        ) : (
          <>
            {/* Saved chats (newest first — reverse so oldest appears at top) */}
            <ChatHistory chats={[...chats].reverse()} />

            {/* Active streaming response */}
            {activeResponse && (
              <div className="space-y-2">
                <ChatBubble role="user" content={activeResponse.userMessage} />
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-bark-100 dark:bg-bark-700 text-bark-800 dark:text-bark-100 rounded-2xl rounded-bl-sm">
                    {activeResponse.assistantMessage || <StreamingDots />}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="border-t border-bark-100 dark:border-bark-700 p-3 flex gap-2">
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
    </div>
  );
}
