import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import StaffOnlyGate from '../components/StaffOnlyGate.jsx';
import { Invoices, Patients } from '../services/api.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useFormatDate } from '../i18n/useFormatDate.js';

export default function InvoicesPage() {
  const { t } = useI18n();
  const { canManageClinic } = usePermissions();
  const formatDate = useFormatDate();
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

  if (!canManageClinic) return <StaffOnlyGate />;

  return (
    <>
      <PageHeader
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        actions={<button className="btn-primary" onClick={() => setOpen(true)}>{t('invoices.new')}</button>}
      />

      <div className="p-8 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs text-slate-500">{t('invoices.showing')}</div>
            <div className="text-2xl font-semibold mt-1">{list.length}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-emerald-600">{t('invoices.paid')}</div>
            <div className="text-2xl font-semibold mt-1">${totals.paid.toFixed(2)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-amber-600">{t('invoices.unpaid')}</div>
            <div className="text-2xl font-semibold mt-1">${totals.unpaid.toFixed(2)}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <select className="input max-w-[180px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{t('common.allStatuses')}</option>
            <option value="unpaid">{t('status.unpaid')}</option>
            <option value="paid">{t('status.paid')}</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">{t('common.loading')}</div>
          ) : list.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">{t('invoices.none')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">#</th>
                  <th className="text-left px-6 py-3">{t('common.patient')}</th>
                  <th className="text-left px-6 py-3">{t('common.amount')}</th>
                  <th className="text-left px-6 py-3">{t('common.date')}</th>
                  <th className="text-left px-6 py-3">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right">{t('common.actions')}</th>
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
                    <td className="px-6 py-3 text-slate-600">{formatDate(new Date(i.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3"><StatusPill status={i.status} /></td>
                    <td className="px-6 py-3 text-right">
                      {i.status === 'unpaid' ? (
                        <button className="btn-primary text-xs py-1 px-3" onClick={() => setStatus(i.id, 'paid')}>{t('invoices.markPaid')}</button>
                      ) : (
                        <button className="btn-secondary text-xs py-1 px-3" onClick={() => setStatus(i.id, 'unpaid')}>{t('invoices.markUnpaid')}</button>
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
  const { t } = useI18n();
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
      setError(t('invoices.modal.required'));
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
      setError(err.response?.data?.error || t('invoices.modal.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('invoices.modal.title')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('common.creating') : t('invoices.modal.create')}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">{t('common.patient')} *</label>
          <select className="input" value={form.patient_id} onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}>
            <option value="">{t('common.selectPatient')}</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name} {p.phone ? `· ${p.phone}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('common.amount')} *</label>
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
