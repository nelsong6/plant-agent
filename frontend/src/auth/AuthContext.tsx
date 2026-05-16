import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { bootstrapAuth, getStoredToken, clearStoredToken, logout as authLogout } from './index';

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
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  // Boot-time auth: try stored session → silent exchange via .romaine.life
  // cookie → fall through unauthenticated. Mirrors the canonical pattern in
  // tank-operator's frontend/src/auth.ts (the template for all
  // .romaine.life apps' delegation).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await bootstrapAuth();
        if (cancelled) return;
        if (result) {
          setToken(result.token);
          setUser(result.user);
        }
      } catch (err) {
        console.error('bootstrapAuth threw:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function setSession(newToken: string, newUser: User) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function logout() {
    await authLogout();
    clearStoredToken();
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
