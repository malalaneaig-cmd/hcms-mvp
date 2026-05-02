import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Doctors } from '../services/api.js';

export default function DoctorsPage() {
  const [list, setList]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]   = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setList(await Doctors.list());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <>
      <PageHeader
        title="Doctors"
        subtitle="Clinic practitioners available for booking"
        actions={<button className="btn-primary" onClick={() => setOpen(true)}>+ Add doctor</button>}
      />

      <div className="p-8">
        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="card p-10 text-center text-slate-500">No doctors yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((d) => (
              <div key={d.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 grid place-items-center text-xl">👨‍⚕️</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{d.name}</div>
                    <div className="text-sm text-slate-500 truncate">{d.specialty || 'General'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewDoctorModal open={open} onClose={() => setOpen(false)} onCreated={refresh} />
    </>
  );
}

function NewDoctorModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', specialty: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm({ name: '', specialty: '' }); setError(''); }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await Doctors.create({ name: form.name, specialty: form.specialty || null });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add doctor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add doctor"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Specialty</label>
          <input className="input" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="e.g. General Practice" />
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
      </form>
    </Modal>
  );
}
