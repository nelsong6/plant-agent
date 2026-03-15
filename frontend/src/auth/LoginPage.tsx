import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { msalInstance, msalReady } from './msal';

export function LoginPage() {
  const { setSession, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // Handle redirect response from Microsoft
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await msalReady;
      const response = await msalInstance.handleRedirectPromise();
      if (cancelled) return;

      if (response?.idToken) {
        try {
          const res = await fetch('/auth/microsoft/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.idToken }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Login failed');
          }

          const data = await res.json();
          setSession(data.token, data.user);
          navigate('/', { replace: true });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Login failed');
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleMicrosoftLogin() {
    await msalReady;
    await msalInstance.loginRedirect({
      scopes: ['openid', 'profile', 'email'],
    });
  }

  if (loading) return null;

  return (
    <div className="min-h-screen bg-leaf-50 dark:bg-bark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-bark-800 rounded-2xl shadow-lg border border-bark-100 dark:border-bark-700 p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-leaf-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-leaf-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 8c.7-1 1-2.2 1-3.5C18 2.5 16.5 1 14.5 1c-1 0-2 .5-2.5 1.2C11.5 1.5 10.5 1 9.5 1 7.5 1 6 2.5 6 4.5c0 1.3.3 2.5 1 3.5" />
                <path d="M12 2v20" />
                <path d="M6 8c-1.5 1.5-3 4-3 7 0 4 2.5 7 9 7s9-3 9-7c0-3-1.5-5.5-3-7" />
              </svg>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-bark-900 dark:text-bark-50 text-center">Plant Agent</h1>
          <p className="text-sm text-bark-500 dark:text-bark-400 text-center mt-1 mb-6">Plant monitoring dashboard</p>

          <div className="flex justify-center">
            <button
              onClick={handleMicrosoftLogin}
              className="flex items-center gap-3 px-6 py-2.5 border border-bark-300 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-700 hover:bg-bark-50 dark:hover:bg-bark-600 transition-colors text-sm font-medium text-bark-800 dark:text-bark-100"
            >
              <svg className="w-5 h-5" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Sign in with Microsoft
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 mt-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
