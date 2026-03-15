import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { msalInstance, msalReady } from './msal';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/** Retry fetch up to `retries` times with exponential backoff (handles cold-start timeouts). */
async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw new Error('unreachable');
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  setSession: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Parse existing JWT on mount
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.sub, name: payload.name, email: payload.email, role: payload.role });
      } catch {
        setToken(null);
        localStorage.removeItem('token');
      }
    }
  }, [token]);

  // Handle MSAL redirect response (runs on any page after Microsoft redirects back)
  useEffect(() => {
    (async () => {
      await msalReady;
      const response = await msalInstance.handleRedirectPromise();

      if (response?.idToken) {
        try {
          const res = await fetchWithRetry(`${API_BASE}/auth/microsoft/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.idToken }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error('Login failed:', res.status, body.error);
          } else {
            const data = await res.json();
            setSession(data.token, data.user);
          }
        } catch (err) {
          console.error('Login failed:', err);
        }
      }
      setLoading(false);
    })();
  }, []);

  function setSession(newToken: string, newUser: User) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin: user?.role === 'admin', setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
