import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Patients } from '../services/api.js';

export default function PatientsPage() {
  const [list, setList]       = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await Patients.list(search);
      setList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(refresh, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Single source of truth for all patient records"
        actions={
          <button onClick={() => setModalOpen(true)} className="btn-primary">+ New Patient</button>
        }
      />

      <div className="p-8 space-y-4">
        <div className="card p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email…"
            className="input"
          />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">No patients found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Phone</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Created</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-6 py-3 text-slate-600">{p.phone || '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{p.email || '—'}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3 text-right">
                      <Link to={`/patients/${p.id}`} className="btn-ghost text-brand-600">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NewPatientModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={refresh} />
    </>
  );
}

function NewPatientModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await Patients.create({
        name:  form.name,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
      });
      setForm({ name: '', phone: '', email: '', notes: '' });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create patient');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New patient"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Create patient'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Full name *</label>
          <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+252…" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}
      </form>
    </Modal>
  );
}
