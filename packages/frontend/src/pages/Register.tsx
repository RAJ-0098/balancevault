import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const T = {
  bg: '#0a1628', surface: '#0f2040', surfaceAlt: '#152a52', border: '#1e3a6e',
  emerald: '#059669', emeraldLight: '#10b981', white: '#ffffff', muted: '#7b92b8', red: '#ef4444',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ email: form.email, password: form.password, firstName: form.firstName || undefined, lastName: form.lastName || undefined });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.white, outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' };
  const lbl = (text: string) => <label style={{ display: 'block', color: T.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.05em' }}>{text}</label>;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏛</div>
          <h1 style={{ color: T.white, fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>BalanceVault</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '4px' }}>Create your account</p>
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '32px' }}>
          <h2 style={{ color: T.white, fontSize: '1.25rem', fontWeight: 700, marginTop: 0, marginBottom: '24px' }}>Register</h2>

          {error && <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#2d0d0d', color: T.red, border: '1px solid #c03030', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>{lbl('FIRST NAME')}<input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inp} /></div>
              <div>{lbl('LAST NAME')}<input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inp} /></div>
            </div>
            <div>{lbl('EMAIL')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" style={inp} /></div>
            <div>{lbl('PASSWORD')}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} placeholder="At least 8 characters" style={inp} /></div>
            <button type="submit" disabled={loading} style={{ marginTop: '8px', padding: '12px', background: T.emerald, border: 'none', borderRadius: '8px', color: T.white, fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.875rem', color: T.muted }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: T.emeraldLight, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>

          <div style={{ marginTop: '16px', padding: '10px 14px', background: T.surfaceAlt, borderRadius: '8px', fontSize: '0.78rem', color: T.muted }}>
            After registration you will be in PENDING status. Submit the onboarding form and an admin will review it.
          </div>
        </div>
      </div>
    </div>
  );
}
