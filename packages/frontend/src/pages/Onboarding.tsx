import { useState, useEffect, type FormEvent } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface OnboardingStatus {
  id: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'NONE';
  submittedAt: string;
  reviewedAt: string | null;
  notes: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  NONE: { label: 'Not started', color: 'bg-slate-100 text-slate-600', icon: '⭕' },
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: '⏳' },
  UNDER_REVIEW: { label: 'Under review', color: 'bg-yellow-100 text-yellow-700', icon: '👀' },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: '✅' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: '❌' },
};

export default function Onboarding() {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .get('/onboarding/status')
      .then((res) => setStatus(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/onboarding/submit', { notes: notes || undefined });
      const res = await api.get('/onboarding/status');
      setStatus(res.data);
      setNotes('');
      setMessage('Onboarding submitted! An admin will review your request.');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="text-slate-500">Loading...</div>;
  }

  const currentStatus = status?.status || 'NONE';
  const config = STATUS_CONFIG[currentStatus];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Onboarding</h1>
      <p className="text-slate-500 mb-8">
        Welcome{user?.firstName ? `, ${user.firstName}` : ''}! Submit your onboarding request for
        admin review. Once approved, a checking account will be created for you.
      </p>

      {/* Status card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">Current status</h2>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
          >
            {config.icon} {config.label}
          </span>
        </div>

        {status && status.status !== 'NONE' && (
          <div className="text-sm text-slate-500 space-y-1">
            <div>Submitted: {new Date(status.submittedAt).toLocaleString()}</div>
            {status.reviewedAt && <div>Reviewed: {new Date(status.reviewedAt).toLocaleString()}</div>}
            {status.notes && (
              <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-600">Admin notes:</span> {status.notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit form — only show if not approved */}
      {currentStatus !== 'APPROVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">
            {currentStatus === 'REJECTED' ? 'Resubmit onboarding' : 'Submit onboarding'}
          </h2>

          {message && (
            <div
              className={`mb-4 p-3 text-sm rounded-lg border ${
                message.includes('submitted')
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition resize-none"
              placeholder="Add any context for the admin reviewer..."
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for review'}
            </button>
          </form>
        </div>
      )}

      {currentStatus === 'APPROVED' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h2 className="text-lg font-semibold text-green-800">You are approved!</h2>
          <p className="text-sm text-green-600 mt-1">
            Your checking account is ready.{' '}
            <a href="/" className="font-medium underline">Go to your dashboard</a>.
          </p>
        </div>
      )}
    </div>
  );
}
