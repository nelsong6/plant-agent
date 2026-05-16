// Microsoft sign-in happens upstream at auth.romaine.life. This SPA:
//   1. On boot, checks for a stored plant-agent session JWT and validates it
//      via /api/auth/me.
//   2. If no valid session, tries to fetch an auth.romaine.life JWT from
//      that service's /api/auth/token endpoint — the auth-service session
//      cookie is on `.romaine.life` so it's auto-attached. If the user is
//      already signed into auth.romaine.life from another app, this is the
//      seamless path that lands them signed in here without any redirect.
//      The JWT is then exchanged at /api/auth/exchange for a plant-agent-
//      signed session JWT.
//   3. If both fail, render the Sign-in button.

import type { User } from '../types';

const TOKEN_KEY = 'token';
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

interface AppConfig {
  auth_url: string;
}

let cachedConfig: AppConfig | null = null;

async function fetchConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
  cachedConfig = await res.json() as AppConfig;
  return cachedConfig;
}

async function fetchUpstreamJWT(authURL: string): Promise<string | null> {
  try {
    const res = await fetch(`${authURL}/api/auth/token`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

async function exchange(upstreamJWT: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/api/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_jwt: upstreamJWT }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Sign-in exchange failed (${res.status}): ${text}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return await res.json() as { token: string; user: User };
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Boot-time auth check. Resolves to the signed-in user, or null. Does NOT
 * trigger a redirect on its own — the SPA shows a Sign-in button for that.
 */
export async function bootstrapAuth(): Promise<{ token: string; user: User } | null> {
  const existing = getStoredToken();
  if (existing) {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${existing}` },
    });
    if (res.ok) {
      const user = await res.json() as User;
      return { token: existing, user };
    }
    clearStoredToken();
  }

  let config: AppConfig;
  try {
    config = await fetchConfig();
  } catch (e) {
    console.info('auth config unavailable; rendering unauthenticated', e);
    return null;
  }
  const upstreamJWT = await fetchUpstreamJWT(config.auth_url);
  if (upstreamJWT) {
    try {
      const body = await exchange(upstreamJWT);
      localStorage.setItem(TOKEN_KEY, body.token);
      return body;
    } catch (e) {
      console.warn('silent exchange failed; user must click Sign-in', e);
    }
  }

  return null;
}

/** User-initiated sign-in: redirect to auth.romaine.life's Microsoft flow. */
export async function startLogin(): Promise<void> {
  const config = await fetchConfig();
  const callbackURL = encodeURIComponent(window.location.origin + window.location.pathname);
  // auth.romaine.life exposes a GET endpoint at /sign-in/microsoft that takes
  // callbackURL as a query param, kicks off Better Auth's social flow, and
  // 302s back to the callback once Microsoft completes. The Better Auth
  // routes under /api/auth/* are POST-only, so a top-level GET there 404s.
  window.location.href = `${config.auth_url}/sign-in/microsoft?callbackURL=${callbackURL}`;
}

export async function logout(): Promise<void> {
  clearStoredToken();
  try {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
  } catch {
    // best-effort
  }
  // Also clear the auth.romaine.life session cookie so the next page load
  // doesn't silently re-SSO via fetchUpstreamJWT.
  try {
    const config = await fetchConfig();
    await fetch(`${config.auth_url}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // best-effort
  }
}
