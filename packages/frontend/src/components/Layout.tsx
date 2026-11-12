import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const T = {
  navy: '#0a1628',
  navyDark: '#071020',
  navyMid: '#0f2040',
  border: '#1e3a6e',
  emerald: '#059669',
  emeraldLight: '#10b981',
  white: '#ffffff',
  offWhite: '#e8eef8',
  muted: '#7b92b8',
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';

  function handleLogout() { logout(); navigate('/login'); }

  const navItems = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', tab: 'overview' },
        { to: '/admin?tab=users', label: 'Users', tab: 'users' },
        { to: '/admin?tab=onboarding', label: 'Onboarding', tab: 'onboarding' },
        { to: '/admin?tab=audit', label: 'Audit Log', tab: 'audit' },
      ]
    : [
        { to: '/', label: 'Accounts', tab: '' },
        { to: '/onboarding', label: 'Onboarding', tab: '' },
      ];

  return (
    <div style={{ minHeight: '100vh', background: '#0d1f3c' }}>
      <nav style={{ background: T.navyDark, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.white, fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>
            <span>🏛</span> BalanceVault
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = isAdmin
                ? currentTab === item.tab
                : location.pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    color: isActive ? T.white : T.muted,
                    background: isActive ? T.emerald : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px', paddingLeft: '12px', borderLeft: `1px solid ${T.border}` }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: T.white, fontWeight: 500 }}>{user?.email}</div>
                <div style={{ fontSize: '0.72rem', color: T.muted }}>{user?.role === 'ADMIN' ? 'Administrator' : 'Account Holder'}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '6px', color: T.offWhite, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 16px' }}>{children}</main>

      <footer style={{ maxWidth: '1152px', margin: '0 auto', padding: '24px 16px', textAlign: 'center', fontSize: '0.75rem', color: T.muted, borderTop: `1px solid ${T.border}` }}>
        BalanceVault — hackathon demo with synthetic data. Not for real funds.
      </footer>
    </div>
  );
}
