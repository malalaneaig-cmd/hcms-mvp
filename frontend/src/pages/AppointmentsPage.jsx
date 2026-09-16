import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import StatusPill, { ChannelPill } from '../components/StatusPill.jsx';
import { Appointments, Doctors, Patients } from '../services/api.js';
import SlotPicker from '../components/SlotPicker.jsx';
import { useBookingLimits } from '../hooks/useBookingLimits.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useFormatDate } from '../i18n/useFormatDate.js';

const STATUS_OPTIONS = ['booked', 'completed', 'cancelled', 'no_show'];
const CHANNEL_OPTIONS = ['reception', 'website', 'phone', 'whatsapp', 'sms'];

export default function AppointmentsPage() {
  const { t } = useI18n();
  const { canManageClinic } = usePermissions();
  const formatDate = useFormatDate();
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState({ status: '', channel: '' });
  const [bookOpen, setBookOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const params = {};
      if (filter.status)  params.status  = filter.status;
      if (filter.channel) params.channel = filter.channel;
      const data = await Appointments.list(params);
      setList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filter]);

  async function setStatus(id, status) {
    await Appointments.setStatus(id, status);
    await refresh();
  }

  return (
    <>
      <PageHeader
        title={t('appointments.title')}
        subtitle={t('appointments.subtitle')}
        actions={
          canManageClinic ? (
            <button onClick={() => setBookOpen(true)} className="btn-primary">{t('appointments.book')}</button>
          ) : null
        }
      />

      <div className="p-8 space-y-4">
        <div className="card p-4 flex items-center gap-3">
          <select className="input max-w-[180px]" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">{t('common.allStatuses')}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
          <select className="input max-w-[180px]" value={filter.channel} onChange={(e) => setFilter((f) => ({ ...f, channel: e.target.value }))}>
            <option value="">{t('common.allChannels')}</option>
            {CHANNEL_OPTIONS.map((ch) => (
              <option key={ch} value={ch}>{t(`channel.${ch}`)}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500 ml-auto">
            {list.length === 1
              ? t('appointments.results', { count: list.length })
              : t('appointments.resultsPlural', { count: list.length })}
          </span>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">{t('common.loading')}</div>
          ) : list.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">{t('appointments.noMatch')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">{t('common.when')}</th>
                  <th className="text-left px-6 py-3">{t('common.patient')}</th>
                  <th className="text-left px-6 py-3">{t('common.doctor')}</th>
                  <th className="text-left px-6 py-3">{t('common.channel')}</th>
                  <th className="text-left px-6 py-3">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="font-medium">{formatDate(new Date(a.appointment_time), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-slate-500">{formatDate(new Date(a.appointment_time), 'HH:mm')}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium">{a.patient_name}</div>
                      <div className="text-xs text-slate-500">{a.patient_phone}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{a.doctor_name}</td>
                    <td className="px-6 py-3"><ChannelPill channel={a.channel} /></td>
                    <td className="px-6 py-3"><StatusPill status={a.status} /></td>
                    <td className="px-6 py-3 text-right">
                      {canManageClinic ? (
                        <select
                          className="input text-xs py-1 max-w-[140px] inline-block"
                          value={a.status}
                          onChange={(e) => setStatus(a.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{t(`status.${s}`)}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusPill status={a.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <BookModal open={bookOpen} onClose={() => setBookOpen(false)} onCreated={refresh} />
    </>
  );
}

function BookModal({ open, onClose, onCreated }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    patient_id: '',
    doctor_id:  '',
    date: '',
    time: '',
    channel: 'reception',
  });
  const { minDate, maxDate, maxDays } = useBookingLimits(form.channel);
  const [doctors, setDoctors]   = useState([]);
  const [patients, setPatients] = useState([]);
  const [search, setSearch]     = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Doctors.list().then(setDoctors);
    Patients.list().then(setPatients);
    setForm({ patient_id: '', doctor_id: '', date: '', time: '', channel: 'reception' });
    setSearch('');
    setError('');
  }, [open]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 8);
    return patients.filter((p) =>
      [p.name, p.phone, p.email].filter(Boolean).some((s) => s.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [search, patients]);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.patient_id) {
      setError(
        search.trim()
          ? t('appointments.bookModal.patientNotFound')
          : t('appointments.bookModal.selectPatientRequired')
      );
      return;
    }
    if (!form.doctor_id || !form.date || !form.time) {
      setError(t('common.required'));
      return;
    }
    setSaving(true);
    try {
      await Appointments.create({
        patient_id:       Number(form.patient_id),
        doctor_id:        Number(form.doctor_id),
        appointment_time: `${form.date}T${form.time}:00`,
        channel:          form.channel,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      onCreated?.();
      if (!err.response) {
        setError(t('appointments.bookModal.networkHiccup'));
      } else {
        setError(err.response?.data?.error || t('appointments.bookModal.failed'));
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedPatient = patients.find((p) => p.id === Number(form.patient_id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('appointments.bookModal.title')}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? t('appointments.bookModal.booking') : t('appointments.bookModal.confirm')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">{t('appointments.bookModal.bookingChannel')}</label>
          <div className="flex gap-2">
            {['reception', 'phone'].map((ch) => (
              <button
                type="button"
                key={ch}
                onClick={() => setForm((f) => ({ ...f, channel: ch, date: '', time: '' }))}
                className={`btn ${form.channel === ch ? 'btn-primary' : 'btn-secondary'}`}
              >
                {ch === 'reception' ? t('appointments.bookModal.receptionBtn') : t('appointments.bookModal.phoneBtn')}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {t('appointments.bookModal.websiteHint')}
          </p>
        </div>

        <div>
          <label className="label">{t('common.patient')}</label>
          <input
            className="input mb-2"
            placeholder={t('appointments.bookModal.searchPatient')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
            {filteredPatients.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">
                {search.trim()
                  ? t('appointments.bookModal.noMatchingPatientsHint')
                  : t('appointments.bookModal.noMatchingPatients')}
              </div>
            )}
            {filteredPatients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  update('patient_id', String(p.id));
                  setSearch(p.name);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                  Number(form.patient_id) === p.id ? 'bg-brand-50' : ''
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">{p.phone || p.email || `id: ${p.id}`}</div>
              </button>
            ))}
          </div>
          {selectedPatient && (
            <div className="text-xs text-brand-700 mt-2">{t('appointments.bookModal.selected', { name: selectedPatient.name })}</div>
          )}
        </div>

        <div>
          <label className="label">{t('common.doctor')}</label>
          <select
            className="input"
            value={form.doctor_id}
            onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value, time: '' }))}
          >
            <option value="">{t('common.selectDoctor')}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name} {d.specialty ? `· ${d.specialty}` : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">{t('common.date')}</label>
          <input
            type="date"
            className="input"
            value={form.date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, time: '' }))}
          />
          <p className="text-xs text-slate-500 mt-1">{t('appointments.bookModal.dateWindowHint', { days: maxDays })}</p>
        </div>

        <div>
          <label className="label">{t('appointments.bookModal.availableTime')}</label>
          <SlotPicker
            doctorId={form.doctor_id}
            date={form.date}
            value={form.time}
            channel={form.channel}
            onChange={(time) => update('time', time)}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}
      </form>
    </Modal>
  );
}
