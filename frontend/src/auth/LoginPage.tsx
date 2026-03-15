import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function LoginPage() {
  const { setSession, user } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
        });
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  async function handleCredentialResponse(response: { credential: string }) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/auth/google/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
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
    } finally {
      setLoading(false);
    }
  }

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
            <div ref={buttonRef} />
          </div>

          {loading && (
            <p className="text-sm text-bark-500 dark:text-bark-400 text-center mt-4">Signing in...</p>
          )}

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
