import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';

// ─── Types ────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  totalAccounts: number;
  totalTransactions: number;
  pendingOnboarding: number;
  admins: number;
  suspended: number;
  totalBalance: string;
}

interface AccountInfo {
  id: string;
  type: string;
  status: string;
  balance: string;
  currency: string;
}

interface AdminUser {
  id: string;
  email: string;
  role: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  _count: { accounts: number };
}

interface AdminUserDetail extends AdminUser {
  accounts: AccountInfo[];
}

interface OnboardingItem {
  id: string;
  userId: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  notes: string | null;
  user: { id: string; email: string; firstName: string | null; lastName: string | null; status: string };
}

interface AuditItem {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; role: string } | null;
}

type Tab = 'overview' | 'users' | 'onboarding' | 'audit';

// ─── Theme tokens ─────────────────────────────────────

const T = {
  bg: '#0d1f3c',
  surface: '#0f2040',
  surfaceAlt: '#152a52',
  border: '#1e3a6e',
  borderLight: '#2a4a80',
  gold: '#ffffff',
  goldLight: '#e8eef8',
  muted: '#7b92b8',
  text: '#ffffff',
  textDim: '#c8d8f0',
  red: '#c0392b',
  redLight: '#ef4444',
  green: '#059669',
  greenLight: '#10b981',
  amber: '#f59e0b',
};

const card: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: '12px',
  padding: '20px',
};

const badge = (color: string, bg: string): React.CSSProperties => ({
  background: bg,
  color,
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: 600,
});

function formatMoney(amount: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(amount));
}

// ─── Component ────────────────────────────────────────

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Read tab from URL ?tab=... so nav links work
  const urlTab = (searchParams.get('tab') as Tab) || 'overview';
  const [tab, setTab] = useState<Tab>(urlTab);

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<{ items: AdminUser[]; total: number }>({ items: [], total: 0 });
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, AdminUserDetail>>({});
  const [onboarding, setOnboarding] = useState<{ items: OnboardingItem[]; total: number }>({ items: [], total: 0 });
  const [audit, setAudit] = useState<{ items: AuditItem[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [reviewModal, setReviewModal] = useState<{ item: OnboardingItem; action: 'approve' | 'reject' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Sync URL → state when user navigates via nav links
  useEffect(() => {
    const t = (searchParams.get('tab') as Tab) || 'overview';
    setTab(t);
  }, [searchParams]);

  const loadStats = useCallback(async () => {
    const res = await api.get('/admin/stats');
    setStats(res.data.stats);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await api.get('/admin/users', { params: { search: search || undefined } });
    setUsers(res.data);
  }, [search]);

  const loadOnboarding = useCallback(async () => {
    const res = await api.get('/admin/onboarding');
    setOnboarding(res.data);
  }, []);

  const loadAudit = useCallback(async () => {
    const res = await api.get('/admin/audit-logs');
    setAudit(res.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    setActionError('');
    setActionSuccess('');
    const loaders: Record<Tab, () => Promise<void>> = {
      overview: loadStats,
      users: loadUsers,
      onboarding: loadOnboarding,
      audit: loadAudit,
    };
    loaders[tab]().finally(() => setLoading(false));
  }, [tab, loadStats, loadUsers, loadOnboarding, loadAudit]);

  function switchTab(t: Tab) {
    setTab(t);
    if (t === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: t });
    }
  }

  async function loadUserDetail(userId: string) {
    if (userDetails[userId]) return;
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setUserDetails((prev) => ({ ...prev, [userId]: res.data.user }));
    } catch {
      // ignore
    }
  }

  async function toggleExpand(userId: string) {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      await loadUserDetail(userId);
    }
  }

  async function handleUserAction(userId: string, action: 'suspend' | 'reactivate') {
    try {
      await api.post(`/admin/users/${userId}/${action}`);
      setActionSuccess(`User ${action}d successfully`);
      await loadUsers();
    } catch (err: any) {
      setActionError(err.response?.data?.error || `Failed to ${action} user`);
    }
  }

  async function handleReview(e: FormEvent) {
    e.preventDefault();
    if (!reviewModal) return;
    try {
      await api.post(`/admin/onboarding/${reviewModal.item.id}/${reviewModal.action}`, {
        notes: reviewNotes || undefined,
      });
      setActionSuccess(`Onboarding ${reviewModal.action}d`);
      setReviewModal(null);
      setReviewNotes('');
      await loadOnboarding();
      await loadStats();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Review failed');
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div>
      <h1 style={{ color: T.gold, fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Admin Dashboard
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: `1px solid ${T.border}` }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            style={{
              padding: '10px 18px',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? `2px solid ${T.gold}` : '2px solid transparent',
              color: tab === t.id ? T.gold : T.muted,
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div style={{ marginBottom: '1rem', padding: '10px 14px', background: '#3d1010', color: '#e88', border: '1px solid #c03030', borderRadius: '8px', fontSize: '0.875rem' }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ marginBottom: '1rem', padding: '10px 14px', background: '#103d10', color: '#8e8', border: '1px solid #30c030', borderRadius: '8px', fontSize: '0.875rem' }}>
          {actionSuccess}
        </div>
      )}

      {loading ? (
        <div style={{ color: T.muted }}>Loading...</div>
      ) : (
        <>
          {/* ─── Overview ──────────────────────────────── */}
          {tab === 'overview' && stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
                { label: 'Accounts', value: stats.totalAccounts, icon: '🏦' },
                { label: 'Transactions', value: stats.totalTransactions, icon: '📊' },
                { label: 'Pending Reviews', value: stats.pendingOnboarding, icon: '⏳' },
                { label: 'Admins', value: stats.admins, icon: '🔑' },
                { label: 'Suspended', value: stats.suspended, icon: '🚫' },
                { label: 'Total Balance', value: formatMoney(stats.totalBalance), icon: '💰' },
              ].map((stat) => (
                <div key={stat.label} style={{ ...card }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: T.gold }}>{stat.value}</div>
                  <div style={{ fontSize: '0.8rem', color: T.muted, marginTop: '2px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Users ──────────────────────────────────── */}
          {tab === 'users' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    background: T.surfaceAlt,
                    border: `1px solid ${T.border}`,
                    borderRadius: '8px',
                    color: T.text,
                    outline: 'none',
                    fontSize: '0.875rem',
                  }}
                />
                <button
                  onClick={loadUsers}
                  style={{ background: T.gold, color: '#1a0f0a', padding: '8px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Search
                </button>
              </div>

              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: T.surfaceAlt }}>
                      {['Email', 'Name', 'Role', 'Status', 'Accounts', 'Actions'].map((h) => (
                        <th key={h} style={{ textAlign: h === 'Actions' ? 'right' : 'left', padding: '12px 16px', color: T.muted, fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.03em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.items.map((u) => (
                      <>
                        <tr
                          key={u.id}
                          style={{ borderTop: `1px solid ${T.border}`, cursor: 'pointer' }}
                          onClick={() => toggleExpand(u.id)}
                        >
                          <td style={{ padding: '12px 16px', color: T.text }}>{u.email}</td>
                          <td style={{ padding: '12px 16px', color: T.textDim }}>{u.firstName || ''} {u.lastName || ''}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ color: u.role === 'ADMIN' ? T.gold : T.muted, fontSize: '0.8rem', fontWeight: 600 }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={badge(
                              u.status === 'ACTIVE' ? T.green : u.status === 'SUSPENDED' ? T.red : T.amber,
                              u.status === 'ACTIVE' ? '#0d2d14' : u.status === 'SUSPENDED' ? '#2d0d0d' : '#2d1a0d',
                            )}>
                              {u.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: T.muted }}>{u._count.accounts}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            {u.role !== 'ADMIN' && (
                              <button
                                onClick={() => handleUserAction(u.id, u.status === 'SUSPENDED' ? 'reactivate' : 'suspend')}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  background: u.status === 'SUSPENDED' ? '#0d2d14' : '#2d0d0d',
                                  color: u.status === 'SUSPENDED' ? T.greenLight : T.redLight,
                                }}
                              >
                                {u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Expanded row — shows account UUIDs */}
                        {expandedUser === u.id && (
                          <tr key={`${u.id}-detail`} style={{ background: T.surfaceAlt }}>
                            <td colSpan={6} style={{ padding: '12px 16px 16px 16px' }}>
                              {userDetails[u.id] ? (
                                userDetails[u.id].accounts.length > 0 ? (
                                  <div>
                                    <div style={{ color: T.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.05em' }}>
                                      ACCOUNT NUMBERS
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {userDetails[u.id].accounts.map((acc) => (
                                        <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: T.surface, borderRadius: '8px', border: `1px solid ${T.border}` }}>
                                          <span style={{ color: T.gold, fontSize: '0.8rem', fontWeight: 600, minWidth: '80px' }}>{acc.type}</span>
                                          <code style={{ color: T.textDim, fontSize: '0.78rem', fontFamily: 'monospace', flex: 1 }}>{acc.id}</code>
                                          <span style={{ color: T.greenLight, fontSize: '0.8rem', fontWeight: 600 }}>{formatMoney(acc.balance)}</span>
                                          <span style={badge(
                                            acc.status === 'ACTIVE' ? T.green : T.muted,
                                            acc.status === 'ACTIVE' ? '#0d2d14' : '#2d1a0d',
                                          )}>
                                            {acc.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: T.muted, fontSize: '0.8rem' }}>No accounts yet</span>
                                )
                              ) : (
                                <span style={{ color: T.muted, fontSize: '0.8rem' }}>Loading...</span>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
                {users.items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: T.muted }}>No users found</div>
                )}
              </div>
            </div>
          )}

          {/* ─── Onboarding ──────────────────────────────── */}
          {tab === 'onboarding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {onboarding.items.map((item) => (
                <div key={item.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: T.text }}>{item.user.firstName || ''} {item.user.lastName || ''}</span>
                      <span style={{ color: T.muted, marginLeft: '8px', fontSize: '0.875rem' }}>{item.user.email}</span>
                    </div>
                    <span style={badge(
                      item.status === 'APPROVED' ? T.green : item.status === 'REJECTED' ? T.red : T.gold,
                      item.status === 'APPROVED' ? '#0d2d14' : item.status === 'REJECTED' ? '#2d0d0d' : '#3d2a0d',
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: T.muted, marginBottom: '10px' }}>
                    Submitted: {new Date(item.submittedAt).toLocaleString()}
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: '0.875rem', color: T.textDim, background: T.surfaceAlt, padding: '10px 14px', borderRadius: '8px', marginBottom: '12px' }}>
                      {item.notes}
                    </div>
                  )}
                  {item.status === 'SUBMITTED' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setReviewModal({ item, action: 'approve' }); setReviewNotes(''); }}
                        style={{ background: T.green, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setReviewModal({ item, action: 'reject' }); setReviewNotes(''); }}
                        style={{ background: '#2d0d0d', color: T.redLight, border: `1px solid ${T.red}`, borderRadius: '8px', padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {onboarding.items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: T.muted }}>No onboarding requests</div>
              )}
            </div>
          )}

          {/* ─── Audit Log ──────────────────────────────── */}
          {tab === 'audit' && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: T.surfaceAlt }}>
                    {['Action', 'User', 'Target', 'IP', 'Timestamp'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: T.muted, fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.03em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.items.map((item) => (
                    <tr key={item.id} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td style={{ padding: '10px 16px' }}>
                        <code style={{ background: T.surfaceAlt, color: T.goldLight, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {item.action}
                        </code>
                      </td>
                      <td style={{ padding: '10px 16px', color: T.textDim }}>{item.user?.email || <span style={{ color: T.muted }}>system</span>}</td>
                      <td style={{ padding: '10px 16px', color: T.muted, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {item.targetType ? `${item.targetType}:${item.targetId?.slice(0, 8)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: T.muted, fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.ipAddress || '—'}</td>
                      <td style={{ padding: '10px 16px', color: T.muted, fontSize: '0.78rem' }}>{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {audit.items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: T.muted }}>No audit entries</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setReviewModal(null)}
        >
          <div
            style={{ ...card, width: '100%', maxWidth: '440px', margin: '0 16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: T.gold, fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', textTransform: 'capitalize' }}>
              {reviewModal.action} Onboarding
            </h2>
            <p style={{ color: T.muted, fontSize: '0.875rem', marginBottom: '16px' }}>
              Reviewing request from <strong style={{ color: T.text }}>{reviewModal.item.user.email}</strong>
            </p>
            <form onSubmit={handleReview}>
              <label style={{ display: 'block', color: T.muted, fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                maxLength={2000}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.text, outline: 'none', resize: 'none', fontSize: '0.875rem', boxSizing: 'border-box' }}
                placeholder="Add notes for the user..."
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  style={{ flex: 1, padding: '10px', background: 'none', border: `1px solid ${T.border}`, borderRadius: '8px', color: T.textDim, cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: reviewModal.action === 'approve' ? T.green : T.red,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {reviewModal.action}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
