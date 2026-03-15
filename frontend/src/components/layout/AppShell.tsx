import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { loginWithMicrosoft } from '../../auth/msal';
import { useTheme } from '../../theme/ThemeContext';

const navLinks = [
  { to: '/', label: 'Plants' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/photos', label: 'Photos' },
];

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        active ? 'text-leaf-600' : 'text-bark-500 hover:text-bark-800 dark:text-bark-400 dark:hover:text-bark-100'
      }`}
    >
      {label}
    </Link>
  );
}

export function AppShell() {
  const { user, isAdmin, authError, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bark-50 dark:bg-bark-900">
      <nav className="sticky top-0 z-30 bg-white dark:bg-bark-800 border-b border-bark-100 dark:border-bark-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2 text-bark-900 dark:text-bark-50 font-semibold text-lg">
              <svg className="w-6 h-6 text-leaf-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 8c.7-1 1-2.2 1-3.5C18 2.5 16.5 1 14.5 1c-1 0-2 .5-2.5 1.2C11.5 1.5 10.5 1 9.5 1 7.5 1 6 2.5 6 4.5c0 1.3.3 2.5 1 3.5" />
                <path d="M12 2v20" />
                <path d="M6 8c-1.5 1.5-3 4-3 7 0 4 2.5 7 9 7s9-3 9-7c0-3-1.5-5.5-3-7" />
              </svg>
              Plant Agent
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <NavLink key={link.to} {...link} />
              ))}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-md text-bark-500 dark:text-bark-400 hover:bg-bark-100 dark:hover:bg-bark-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-leaf-100 text-leaf-700 flex items-center justify-center text-xs font-semibold">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-bark-600 dark:text-bark-300">{user.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-xs text-bark-500 hover:text-bark-700 dark:text-bark-400 dark:hover:text-bark-200 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={loginWithMicrosoft}
                  className="inline-flex items-center gap-3 px-3 py-2 rounded border border-[#8C8C8C] bg-white text-[#5E5E5E] text-sm font-semibold cursor-pointer hover:bg-[#F2F2F2] active:bg-[#E1E1E1] transition-colors dark:bg-[#2F2F2F] dark:text-white dark:border-[#8C8C8C] dark:hover:bg-[#3A3A3A] dark:active:bg-[#444444]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                  </svg>
                  Sign in with Microsoft
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-1.5 rounded-md text-bark-500 dark:text-bark-400 hover:bg-bark-100 dark:hover:bg-bark-700 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-bark-100 dark:border-bark-700 bg-white dark:bg-bark-800 px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block text-sm text-bark-600 dark:text-bark-300 hover:text-bark-900 dark:hover:text-bark-50 py-1"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {authError && (
        <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-4 py-2 text-center">
          <p className="text-sm text-red-700 dark:text-red-300">{authError}</p>
        </div>
      )}

      {user && !isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-center">
          <p className="text-sm text-amber-700 dark:text-amber-300">Your account has view-only privileges</p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
