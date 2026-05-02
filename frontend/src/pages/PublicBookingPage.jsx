import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Doctors, Appointments } from '../services/api.js';

export default function PublicBookingPage() {
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
      setError('Please complete all required fields.');
      return;
    }
    setLoading(true);
    try {
      const local = new Date(`${form.date}T${form.time}`);
      const res = await Appointments.publicBook({
        patient_name:     form.patient_name,
        patient_phone:    form.patient_phone,
        patient_email:    form.patient_email || null,
        doctor_id:        Number(form.doctor_id),
        appointment_time: local.toISOString(),
      });
      setSuccess(res);
    } catch (err) {
      setError(err.response?.data?.error || 'We could not book that slot. Please try another time.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const a = success.appointment;
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-emerald-50 grid place-items-center p-4">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 grid place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="text-2xl text-slate-900 mb-1">Appointment confirmed</h1>
          <p className="text-sm text-slate-500 mb-6">We've recorded your booking through the website channel.</p>
          <dl className="text-sm space-y-2 text-left bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between"><dt className="text-slate-500">Patient</dt><dd>{success.patient.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Doctor</dt><dd>{doctors.find((d) => d.id === a.doctor_id)?.name || `Doctor #${a.doctor_id}`}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">When</dt><dd>{format(new Date(a.appointment_time), 'PPpp')}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Reference</dt><dd>#{a.id}</dd></div>
          </dl>
          <button className="btn-primary w-full mt-6" onClick={() => { setSuccess(null); setForm({ patient_name: '', patient_phone: '', patient_email: '', doctor_id: '', date: '', time: '' }); }}>
            Book another
          </button>
          <Link to="/login" className="block text-xs text-slate-500 mt-4 hover:underline">Staff login →</Link>
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
            <div className="text-xs text-slate-500">Online booking</div>
          </div>
        </div>
        <Link to="/login" className="text-sm text-slate-500 hover:underline">Staff login</Link>
      </header>

      <div className="max-w-3xl mx-auto pb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl text-slate-900">Book an appointment</h1>
          <p className="text-slate-500 mt-2">Fill in the form and we'll confirm your slot instantly.</p>
        </div>

        <form onSubmit={submit} className="card p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name *</label>
              <input className="input" value={form.patient_name} onChange={(e) => update('patient_name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Phone number *</label>
              <input className="input" value={form.patient_phone} onChange={(e) => update('patient_phone', e.target.value)} placeholder="+252…" required />
            </div>
          </div>

          <div>
            <label className="label">Email (optional)</label>
            <input type="email" className="input" value={form.patient_email} onChange={(e) => update('patient_email', e.target.value)} />
          </div>

          <div>
            <label className="label">Doctor *</label>
            <select className="input" value={form.doctor_id} onChange={(e) => update('doctor_id', e.target.value)} required>
              <option value="">Choose a doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` · ${d.specialty}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={(e) => update('date', e.target.value)} required />
            </div>
            <div>
              <label className="label">Time *</label>
              <input type="time" className="input" value={form.time} onChange={(e) => update('time', e.target.value)} required />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Booking…' : 'Confirm booking'}
          </button>

          <p className="text-center text-xs text-slate-500">
            By booking you agree to be contacted on the phone number provided.
          </p>
        </form>
      </div>
    </div>
  );
}
