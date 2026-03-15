import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderBottom: '1px solid #eee' }}>
        <Link to="/" style={{ fontWeight: 'bold', textDecoration: 'none', color: 'inherit' }}>
          Plant Agent
        </Link>
        <Link to="/" style={{ textDecoration: 'none', color: '#666' }}>Plants</Link>
        <Link to="/tasks" style={{ textDecoration: 'none', color: '#666' }}>Tasks</Link>
        <Link to="/photos" style={{ textDecoration: 'none', color: '#666' }}>Photos</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span style={{ fontSize: 14, color: '#666' }}>{user.name}</span>
              <button onClick={logout} style={{ fontSize: 12 }}>Logout</button>
            </>
          ) : (
            <Link to="/login" style={{ textDecoration: 'none', color: '#3b82f6', fontSize: 14 }}>
              Sign In
            </Link>
          )}
        </div>
      </nav>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
