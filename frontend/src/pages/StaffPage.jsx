import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Staff } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const ROLE_COLORS = {
  admin:  'bg-purple-50 text-purple-700',
  doctor: 'bg-emerald-50 text-emerald-700',
  staff:  'bg-slate-100 text-slate-700',
};

function RolePill({ role }) {
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md ${ROLE_COLORS[role] || ROLE_COLORS.staff}`}>
      {role}
    </span>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [open, setOpen]       = useState(false);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setList(await Staff.list());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="p-10">
        <div className="card p-10 text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Admin only</h2>
          <p className="text-sm text-slate-500">Only administrators can view and manage staff accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Manage clinic users — administrators, staff, and doctor accounts"
        actions={<button className="btn-primary" onClick={() => setOpen(true)}>+ Add staff</button>}
      />

      <div className="p-8 space-y-4">
        {error && (
          <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
        )}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">No staff yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Role</th>
                  <th className="text-left px-6 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium">
                      {u.full_name}
                      {u.id === user.id && (
                        <span className="ml-2 text-xs text-slate-400">(you)</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{u.email}</td>
                    <td className="px-6 py-3"><RolePill role={u.role} /></td>
                    <td className="px-6 py-3 text-slate-500">{format(new Date(u.created_at), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NewStaffModal open={open} onClose={() => setOpen(false)} onCreated={refresh} />
    </>
  );
}

function NewStaffModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'staff' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ email: '', password: '', full_name: '', role: 'staff' });
      setError('');
    }
  }, [open]);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || !form.full_name) {
      setError('Email, password, and full name are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await Staff.create(form);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add staff member');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add staff member"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Create account'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Full name *</label>
          <input
            className="input"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            placeholder="e.g. Dr. Amina Khalif"
            required
          />
        </div>
        <div>
          <label className="label">Email *</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="user@clinic.local"
            required
          />
        </div>
        <div>
          <label className="label">Temporary password *</label>
          <input
            type="text"
            className="input"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="At least 6 characters"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Share this securely with the new user — they should change it on first login.
          </p>
        </div>
        <div>
          <label className="label">Role *</label>
          <select className="input" value={form.role} onChange={(e) => update('role', e.target.value)}>
            <option value="staff">Staff (reception, front desk)</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin (can manage staff)</option>
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}
      </form>
    </Modal>
  );
}
