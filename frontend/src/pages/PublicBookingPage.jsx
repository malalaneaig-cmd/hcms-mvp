import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Doctors, Appointments } from '../services/api.js';
import SlotPicker from '../components/SlotPicker.jsx';
import LocaleDateInput from '../components/LocaleDateInput.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useFormatDate } from '../i18n/useFormatDate.js';
import { useBookingLimits } from '../hooks/useBookingLimits.js';

export default function PublicBookingPage() {
  const { t } = useI18n();
  const formatDate = useFormatDate();
  const { minDate, maxDate, maxDays } = useBookingLimits('website');
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    patient_name:  '',
    patient_phone: '',
    patient_email: '',
    doctor_id:     '',
    date: '',
    time: '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Doctors.public().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccess(null);
    if (!form.patient_name || !form.patient_phone || !form.doctor_id || !form.date || !form.time) {
      setError(t('booking.completeFields'));
      return;
    }
    setLoading(true);
    try {
      const res = await Appointments.publicBook({
        patient_name:     form.patient_name,
        patient_phone:    form.patient_phone,
        patient_email:    form.patient_email || null,
        doctor_id:        Number(form.doctor_id),
        appointment_time: `${form.date}T${form.time}:00`,
      });
      setSuccess(res);
    } catch (err) {
      if (!err.response) {
        setError(t('booking.networkReach'));
      } else {
        setError(err.response?.data?.error || t('booking.slotFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const a = success.appointment;
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-emerald-50 grid place-items-center p-4">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="max-w-md w-full card p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 grid place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="text-2xl text-slate-900 mb-1">{t('booking.confirmed')}</h1>
          <p className="text-sm text-slate-500 mb-6">{t('booking.confirmedHint')}</p>
          <dl className="text-sm space-y-2 text-left bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between"><dt className="text-slate-500">{t('common.patient')}</dt><dd>{success.patient.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('common.doctor')}</dt><dd>{doctors.find((d) => d.id === a.doctor_id)?.name || `#${a.doctor_id}`}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('booking.when')}</dt><dd>{formatDate(new Date(a.appointment_time), 'PPpp')}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('booking.reference')}</dt><dd>#{a.id}</dd></div>
          </dl>
          <button className="btn-primary w-full mt-6" onClick={() => { setSuccess(null); setForm({ patient_name: '', patient_phone: '', patient_email: '', doctor_id: '', date: '', time: '' }); }}>
            {t('booking.bookAnother')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <header className="max-w-3xl mx-auto py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 grid place-items-center text-white text-lg">🏥</div>
          <div>
            <div className="font-semibold">HCMS Clinic</div>
            <div className="text-xs text-slate-500">{t('booking.online')}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/login" className="text-sm text-slate-500 hover:underline">{t('booking.staffLogin')}</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto pb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl text-slate-900">{t('booking.title')}</h1>
          <p className="text-slate-500 mt-2">{t('booking.subtitle')}</p>
        </div>

        <form onSubmit={submit} className="card p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('booking.fullName')}</label>
              <input className="input" value={form.patient_name} onChange={(e) => update('patient_name', e.target.value)} required />
            </div>
            <div>
              <label className="label">{t('booking.phone')}</label>
              <input className="input" value={form.patient_phone} onChange={(e) => update('patient_phone', e.target.value)} placeholder={t('booking.phonePh')} required />
            </div>
          </div>

          <div>
            <label className="label">{t('booking.emailOptional')}</label>
            <input type="email" className="input" value={form.patient_email} onChange={(e) => update('patient_email', e.target.value)} />
          </div>

          <div>
            <label className="label">{t('booking.doctor')}</label>
            <select
              className="input"
              value={form.doctor_id}
              onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value, time: '' }))}
              required
            >
              <option value="">{t('booking.chooseDoctor')}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` · ${d.specialty}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">{t('booking.date')}</label>
            <LocaleDateInput
              value={form.date}
              min={minDate}
              max={maxDate}
              required
              onChange={(iso) => setForm((f) => ({ ...f, date: iso, time: '' }))}
            />
            <p className="text-xs text-slate-500 mt-1">{t('booking.dateWindowHint', { days: maxDays })}</p>
            <p className="text-xs text-slate-600 mt-0.5">{t('booking.dateFormatHint')}</p>
          </div>

          <div>
            <label className="label">{t('booking.availableTime')}</label>
            <SlotPicker
              doctorId={form.doctor_id}
              date={form.date}
              value={form.time}
              channel="website"
              onChange={(slot) => update('time', slot)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t('booking.booking') : t('booking.confirm')}
          </button>

          <p className="text-center text-xs text-slate-500">{t('booking.consent')}</p>
        </form>
      </div>
    </div>
  );
}
