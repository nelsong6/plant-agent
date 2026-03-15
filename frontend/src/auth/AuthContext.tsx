import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { msalInstance, msalReady } from './msal';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  authError: string | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

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
          const res = await fetch(`${API_BASE}/auth/microsoft/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.idToken }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setAuthError(`Login failed (${res.status}): ${body.error ?? 'unknown error'}`);
          } else {
            const data = await res.json();
            setSession(data.token, data.user);
          }
        } catch (err) {
          setAuthError(`Login failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (!token) {
        // MSAL redirected back but no idToken — may indicate a silent failure
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          setAuthError('MSAL has account but handleRedirectPromise returned no token — try signing in again');
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
    <AuthContext.Provider value={{ user, token, loading, isAdmin: user?.role === 'admin', authError, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
