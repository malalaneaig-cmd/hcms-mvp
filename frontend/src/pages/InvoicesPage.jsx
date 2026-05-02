import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { Invoices, Patients } from '../services/api.js';

export default function InvoicesPage() {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [open, setOpen]       = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      setList(await Invoices.list(params));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filter]);

  async function setStatus(id, status) {
    await Invoices.setStatus(id, status);
    await refresh();
  }

  const totals = useMemo(() => {
    return list.reduce(
      (acc, i) => {
        const amt = Number(i.amount);
        if (i.status === 'paid')   acc.paid   += amt;
        if (i.status === 'unpaid') acc.unpaid += amt;
        return acc;
      },
      { paid: 0, unpaid: 0 }
    );
  }, [list]);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Basic billing — track unpaid and paid invoices"
        actions={<button className="btn-primary" onClick={() => setOpen(true)}>+ New invoice</button>}
      />

      <div className="p-8 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs text-slate-500">Showing</div>
            <div className="text-2xl font-semibold mt-1">{list.length}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-emerald-600">Paid</div>
            <div className="text-2xl font-semibold mt-1">${totals.paid.toFixed(2)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-amber-600">Unpaid</div>
            <div className="text-2xl font-semibold mt-1">${totals.unpaid.toFixed(2)}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <select className="input max-w-[180px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">No invoices.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">#</th>
                  <th className="text-left px-6 py-3">Patient</th>
                  <th className="text-left px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Date</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-500">#{i.id}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium">{i.patient_name}</div>
                      <div className="text-xs text-slate-500">{i.patient_phone}</div>
                    </td>
                    <td className="px-6 py-3 font-medium">${Number(i.amount).toFixed(2)}</td>
                    <td className="px-6 py-3 text-slate-600">{format(new Date(i.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3"><StatusPill status={i.status} /></td>
                    <td className="px-6 py-3 text-right">
                      {i.status === 'unpaid' ? (
                        <button className="btn-primary text-xs py-1 px-3" onClick={() => setStatus(i.id, 'paid')}>Mark paid</button>
                      ) : (
                        <button className="btn-secondary text-xs py-1 px-3" onClick={() => setStatus(i.id, 'unpaid')}>Mark unpaid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NewInvoiceModal open={open} onClose={() => setOpen(false)} onCreated={refresh} />
    </>
  );
}

function NewInvoiceModal({ open, onClose, onCreated }) {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient_id: '', amount: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Patients.list().then(setPatients);
    setForm({ patient_id: '', amount: '' });
    setError('');
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.patient_id || !form.amount) {
      setError('Patient and amount are required');
      return;
    }
    setSaving(true);
    try {
      await Invoices.create({
        patient_id: Number(form.patient_id),
        amount:     Number(form.amount),
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New invoice"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create invoice'}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Patient *</label>
          <select className="input" value={form.patient_id} onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}>
            <option value="">Select a patient…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name} {p.phone ? `· ${p.phone}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Amount *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
      </form>
    </Modal>
  );
}
