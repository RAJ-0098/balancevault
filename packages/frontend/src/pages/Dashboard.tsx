import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Account {
  id: string;
  type: 'CHECKING' | 'SAVINGS';
  status: 'PENDING' | 'ACTIVE' | 'FROZEN' | 'CLOSED';
  balance: string;
  currency: string;
  createdAt: string;
  transactions?: Transaction[];
}

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description: string | null;
  reference: string | null;
  balanceAfter: string;
  createdAt: string;
}

const T = {
  bg: '#0d1f3c',
  surface: '#0f2040',
  surfaceAlt: '#152a52',
  border: '#1e3a6e',
  emerald: '#059669',
  emeraldLight: '#10b981',
  white: '#ffffff',
  offWhite: '#e8eef8',
  muted: '#7b92b8',
  red: '#ef4444',
  amber: '#f59e0b',
};

function formatMoney(amount: string, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount));
}

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'deposit' | 'withdraw' | 'transfer'>(null);
  const [form, setForm] = useState({ amount: '', description: '', toAccountId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load accounts');
    } finally { setLoading(false); }
  }

  async function selectAccount(id: string) {
    try {
      const res = await api.get(`/accounts/${id}`);
      setSelectedAccount(res.data.account);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load account');
    }
  }

  async function handleMoneyAction(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!modal || !selectedAccount) return;
    try {
      if (modal === 'transfer') {
        await api.post('/accounts/transfer', { fromAccountId: selectedAccount.id, toAccountId: form.toAccountId, amount: form.amount, description: form.description || undefined });
      } else {
        await api.post(`/accounts/${selectedAccount.id}/${modal}`, { amount: form.amount, description: form.description || undefined });
      }
      setSuccess(`${modal.charAt(0).toUpperCase() + modal.slice(1)} completed!`);
      setModal(null);
      setForm({ amount: '', description: '', toAccountId: '' });
      await loadAccounts();
      await selectAccount(selectedAccount.id);
    } catch (err: any) {
      setError(err.response?.data?.error || `${modal} failed`);
    }
  }

  if (loading) return <div style={{ color: T.muted }}>Loading your accounts...</div>;

  if (user?.status === 'PENDING') return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
        <h1 style={{ color: T.white, fontSize: '1.25rem', fontWeight: 700 }}>Onboarding required</h1>
        <p style={{ color: T.muted, marginTop: '8px' }}>Submit your onboarding request for admin review.</p>
        <Link to="/onboarding" style={{ display: 'inline-block', marginTop: '16px', background: T.emerald, color: T.white, padding: '10px 24px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>Go to onboarding</Link>
      </div>
    </div>
  );

  if (user?.status === 'SUSPENDED') return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ background: T.surface, border: `1px solid #c03030`, borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚫</div>
        <h1 style={{ color: T.red, fontSize: '1.25rem', fontWeight: 700 }}>Account suspended</h1>
        <p style={{ color: T.muted, marginTop: '8px' }}>Contact an administrator to restore access.</p>
      </div>
    </div>
  );

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.white, outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ color: T.white, fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Your Accounts</h1>
        <span style={{ color: T.muted, fontSize: '0.875rem' }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
      </div>

      {error && <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#2d0d0d', color: T.red, border: '1px solid #c03030', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#0a2d1a', color: T.emeraldLight, border: '1px solid #059669', borderRadius: '8px', fontSize: '0.875rem' }}>{success}</div>}

      {/* Account cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {accounts.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: T.muted }}>No accounts yet. An admin needs to approve your onboarding first.</div>
        )}
        {accounts.map((acc) => {
          const sel = selectedAccount?.id === acc.id;
          return (
            <button key={acc.id} onClick={() => selectAccount(acc.id)} style={{ textAlign: 'left', background: T.surface, border: `2px solid ${sel ? T.emerald : T.border}`, borderRadius: '14px', padding: '20px', cursor: 'pointer', boxShadow: sel ? `0 0 0 1px ${T.emerald}` : 'none', transition: 'border-color 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>{acc.type === 'CHECKING' ? '💳' : '🏦'}</span>
                  <span style={{ fontWeight: 700, color: T.white, fontSize: '0.9rem' }}>{acc.type}</span>
                </div>
                <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: acc.status === 'ACTIVE' ? '#064d2e' : '#1e3a6e', color: acc.status === 'ACTIVE' ? T.emeraldLight : T.muted }}>
                  {acc.status}
                </span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: T.white }}>{formatMoney(acc.balance, acc.currency)}</div>
              <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: '8px', fontFamily: 'monospace' }}>{acc.id}</div>
            </button>
          );
        })}
      </div>

      {/* Account detail */}
      {selectedAccount && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ color: T.white, fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{selectedAccount.type} Account</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['deposit', 'withdraw', 'transfer'] as const).map((action) => (
                <button key={action} onClick={() => setModal(action)} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize', background: action === 'deposit' ? T.emerald : action === 'withdraw' ? '#b45309' : '#1e3a6e', color: T.white }}>
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 700, color: T.white, marginBottom: '24px' }}>
            {formatMoney(selectedAccount.balance, selectedAccount.currency)}
          </div>

          <div style={{ color: T.muted, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '12px' }}>RECENT TRANSACTIONS</div>

          {selectedAccount.transactions && selectedAccount.transactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedAccount.transactions.map((tx) => {
                const isCredit = tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN';
                return (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: T.surfaceAlt, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: isCredit ? '#064d2e' : '#3d1010', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>{isCredit ? '↓' : '↑'}</span>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: T.white }}>{tx.type.replace('_', ' ')}</div>
                        <div style={{ fontSize: '0.72rem', color: T.muted }}>{tx.description || '—'}{tx.reference && <span style={{ fontFamily: 'monospace', marginLeft: '8px' }}>ref: {tx.reference}</span>}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: isCredit ? T.emeraldLight : T.red, fontSize: '0.9rem' }}>{isCredit ? '+' : '−'}{formatMoney(tx.amount, selectedAccount.currency)}</div>
                      <div style={{ fontSize: '0.72rem', color: T.muted }}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: T.muted, fontSize: '0.875rem' }}>No transactions yet</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && selectedAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModal(null)}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '420px', margin: '0 16px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: T.white, fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', textTransform: 'capitalize' }}>{modal} — {selectedAccount.type}</h2>
            <form onSubmit={handleMoneyAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {modal === 'transfer' && (
                <div>
                  <label style={{ display: 'block', color: T.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>TO ACCOUNT ID</label>
                  <input type="text" value={form.toAccountId} onChange={(e) => setForm({ ...form, toAccountId: e.target.value })} required placeholder="Destination account UUID" style={inp} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', color: T.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>AMOUNT</label>
                <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', color: T.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>DESCRIPTION (optional)</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's this for?" style={inp} />
              </div>
              {error && <div style={{ color: T.red, fontSize: '0.8rem' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', background: 'none', border: `1px solid ${T.border}`, borderRadius: '8px', color: T.offWhite, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: T.emerald, border: 'none', borderRadius: '8px', color: T.white, cursor: 'pointer', fontWeight: 700, textTransform: 'capitalize' }}>{modal}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
