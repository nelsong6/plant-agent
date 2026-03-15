import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { msalInstance, msalReady } from './msal';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
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
          const res = await fetch('/auth/microsoft/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.idToken }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error('Login failed:', body.error);
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
    <AuthContext.Provider value={{ user, token, loading, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
