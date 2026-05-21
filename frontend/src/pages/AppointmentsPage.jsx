import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import StatusPill, { ChannelPill } from '../components/StatusPill.jsx';
import { Appointments, Doctors, Patients } from '../services/api.js';

export default function AppointmentsPage() {
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
        title="Appointments"
        subtitle="All bookings across reception, website, and phone channels"
        actions={
          <button onClick={() => setBookOpen(true)} className="btn-primary">+ Book appointment</button>
        }
      />

      <div className="p-8 space-y-4">
        <div className="card p-4 flex items-center gap-3">
          <select className="input max-w-[180px]" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
          <select className="input max-w-[180px]" value={filter.channel} onChange={(e) => setFilter((f) => ({ ...f, channel: e.target.value }))}>
            <option value="">All channels</option>
            <option value="reception">Reception</option>
            <option value="website">Website</option>
            <option value="phone">Phone</option>
          </select>
          <span className="text-xs text-slate-500 ml-auto">{list.length} result{list.length !== 1 && 's'}</span>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">No appointments match these filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">When</th>
                  <th className="text-left px-6 py-3">Patient</th>
                  <th className="text-left px-6 py-3">Doctor</th>
                  <th className="text-left px-6 py-3">Channel</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="font-medium">{format(new Date(a.appointment_time), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-slate-500">{format(new Date(a.appointment_time), 'HH:mm')}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium">{a.patient_name}</div>
                      <div className="text-xs text-slate-500">{a.patient_phone}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{a.doctor_name}</td>
                    <td className="px-6 py-3"><ChannelPill channel={a.channel} /></td>
                    <td className="px-6 py-3"><StatusPill status={a.status} /></td>
                    <td className="px-6 py-3 text-right">
                      <select
                        className="input text-xs py-1 max-w-[140px] inline-block"
                        value={a.status}
                        onChange={(e) => setStatus(a.id, e.target.value)}
                      >
                        <option value="booked">Booked</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No-show</option>
                      </select>
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
  const [doctors, setDoctors]   = useState([]);
  const [patients, setPatients] = useState([]);
  const [search, setSearch]     = useState('');
  const [form, setForm] = useState({
    patient_id: '',
    doctor_id:  '',
    date: '',
    time: '',
    channel: 'reception',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Doctors.list().then(setDoctors);
    Patients.list().then(setPatients);
    setForm({ patient_id: '', doctor_id: '', date: '', time: '', channel: 'reception' });
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
    if (!form.patient_id || !form.doctor_id || !form.date || !form.time) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    try {
      // Send a naive local datetime (no Z / no UTC conversion).
      // The clinic operates in one timezone; storing wall-clock time end-to-end avoids
      // off-by-one bugs from TIMESTAMP-without-time-zone columns.
      await Appointments.create({
        patient_id:       Number(form.patient_id),
        doctor_id:        Number(form.doctor_id),
        appointment_time: `${form.date}T${form.time}:00`,
        channel:          form.channel,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      // Refresh the list regardless — if a network blip ate the response,
      // the booking may have succeeded server-side and we want to show it.
      onCreated?.();
      if (!err.response) {
        setError(
          'Network hiccup — your booking may have been saved. Please close this dialog and check the list below before retrying.'
        );
      } else {
        setError(err.response?.data?.error || 'Failed to book');
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
      title="Book appointment"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Booking…' : 'Confirm booking'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Booking channel</label>
          <div className="flex gap-2">
            {['reception', 'phone'].map((ch) => (
              <button
                type="button"
                key={ch}
                onClick={() => update('channel', ch)}
                className={`btn ${form.channel === ch ? 'btn-primary' : 'btn-secondary'}`}
              >
                {ch === 'reception' ? '🧑‍💼 Reception' : '📞 Phone'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Website bookings come in automatically through the public form.
          </p>
        </div>

        <div>
          <label className="label">Patient</label>
          <input
            className="input mb-2"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
            {filteredPatients.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No matching patients.</div>
            )}
            {filteredPatients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => update('patient_id', String(p.id))}
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
            <div className="text-xs text-brand-700 mt-2">Selected: {selectedPatient.name}</div>
          )}
        </div>

        <div>
          <label className="label">Doctor</label>
          <select className="input" value={form.doctor_id} onChange={(e) => update('doctor_id', e.target.value)}>
            <option value="">Select a doctor…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name} {d.specialty ? `· ${d.specialty}` : ''}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => update('date', e.target.value)} />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={form.time} onChange={(e) => update('time', e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}
      </form>
    </Modal>
  );
}
