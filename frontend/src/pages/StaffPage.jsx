import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Doctors, Staff } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useFormatDate } from '../i18n/useFormatDate.js';

const ROLE_COLORS = {
  admin:  'bg-purple-50 text-purple-700',
  doctor: 'bg-emerald-50 text-emerald-700',
  staff:  'bg-slate-100 text-slate-700',
};

function RolePill({ role }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md ${ROLE_COLORS[role] || ROLE_COLORS.staff}`}>
      {t(`role.${role}`)}
    </span>
  );
}

export default function StaffPage() {
  const { t } = useI18n();
  const formatDate = useFormatDate();
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
      setError(err.response?.data?.error || t('staff.failedLoad'));
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
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('staff.adminOnly')}</h2>
          <p className="text-sm text-slate-500">{t('staff.adminOnlyHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t('staff.title')}
        subtitle={t('staff.subtitle')}
        actions={<button className="btn-primary" onClick={() => setOpen(true)}>{t('staff.add')}</button>}
      />

      <div className="p-8 space-y-4">
        {error && (
          <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
        )}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">{t('common.loading')}</div>
          ) : list.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">{t('staff.none')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">{t('common.name')}</th>
                  <th className="text-left px-6 py-3">{t('common.email')}</th>
                  <th className="text-left px-6 py-3">{t('staff.modal.role').replace(' *', '')}</th>
                  <th className="text-left px-6 py-3">{t('common.joined')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium">
                      {u.full_name}
                      {u.id === user.id && (
                        <span className="ml-2 text-xs text-slate-400">{t('common.you')}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{u.email}</td>
                    <td className="px-6 py-3"><RolePill role={u.role} /></td>
                    <td className="px-6 py-3 text-slate-500">{formatDate(new Date(u.created_at), 'MMM d, yyyy')}</td>
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
  const { t } = useI18n();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'staff', doctor_id: '' });
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ email: '', password: '', full_name: '', role: 'staff', doctor_id: '' });
    setError('');
    Doctors.list().then(setDoctors);
  }, [open]);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || !form.full_name) {
      setError(t('staff.modal.required'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('staff.modal.passwordMin'));
      return;
    }
    if (form.role === 'doctor' && !form.doctor_id) {
      setError(t('staff.modal.practitionerRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.role === 'doctor') {
        payload.doctor_id = Number(form.doctor_id);
      } else {
        delete payload.doctor_id;
      }
      await Staff.create(payload);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('staff.modal.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('staff.modal.title')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? t('common.saving') : t('staff.modal.create')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">{t('patients.modal.fullName')}</label>
          <input
            className="input"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            placeholder={t('staff.modal.namePh')}
            required
          />
        </div>
        <div>
          <label className="label">{t('common.email')} *</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder={t('staff.modal.emailPh')}
            required
          />
        </div>
        <div>
          <label className="label">{t('staff.modal.tempPassword')}</label>
          <input
            type="text"
            className="input"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder={t('staff.modal.passwordPh')}
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            {t('staff.modal.passwordHint')}
          </p>
        </div>
        <div>
          <label className="label">{t('staff.modal.role')}</label>
          <select
            className="input"
            value={form.role}
            onChange={(e) => {
              const role = e.target.value;
              setForm((f) => ({ ...f, role, doctor_id: role === 'doctor' ? f.doctor_id : '' }));
            }}
          >
            <option value="staff">{t('staff.modal.roleStaff')}</option>
            <option value="doctor">{t('staff.modal.roleDoctor')}</option>
            <option value="admin">{t('staff.modal.roleAdmin')}</option>
          </select>
        </div>

        {form.role === 'doctor' && (
          <div>
            <label className="label">{t('staff.modal.practitionerProfile')}</label>
            <select
              className="input"
              value={form.doctor_id}
              onChange={(e) => update('doctor_id', e.target.value)}
              required
            >
              <option value="">{t('staff.modal.selectPractitioner')}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.specialty ? ` · ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}
      </form>
    </Modal>
  );
}
