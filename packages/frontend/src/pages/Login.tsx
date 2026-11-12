import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const T = {
  bg: '#0a1628',
  surface: '#0f2040',
  surfaceAlt: '#152a52',
  border: '#1e3a6e',
  navy: '#0a1628',
  blue: '#1a3a6e',
  emerald: '#059669',
  emeraldLight: '#10b981',
  white: '#ffffff',
  offWhite: '#f0f4ff',
  muted: '#7b92b8',
  red: '#ef4444',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: T.surfaceAlt, border: `1px solid ${T.border}`,
    borderRadius: '8px', color: T.white,
    outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏛</div>
          <h1 style={{ color: T.white, fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>BalanceVault</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '4px' }}>Secure account management</p>
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '32px' }}>
          <h2 style={{ color: T.white, fontSize: '1.25rem', fontWeight: 700, marginTop: 0, marginBottom: '24px' }}>Sign in</h2>

          {error && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#2d0d0d', color: T.red, border: '1px solid #c03030', borderRadius: '8px', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: T.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.05em' }}>EMAIL</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', color: T.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.05em' }}>PASSWORD</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
            </div>
            <button
              type="submit" disabled={loading}
              style={{ marginTop: '8px', padding: '12px', background: T.emerald, border: 'none', borderRadius: '8px', color: T.white, fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.875rem', color: T.muted }}>
            Need an account?{' '}
            <Link to="/register" style={{ color: T.emeraldLight, fontWeight: 600, textDecoration: 'none' }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
