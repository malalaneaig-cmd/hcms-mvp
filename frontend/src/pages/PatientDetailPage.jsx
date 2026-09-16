import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import StatusPill, { ChannelPill } from '../components/StatusPill.jsx';
import { Patients, Notes, Appointments, Invoices } from '../services/api.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useFormatDate } from '../i18n/useFormatDate.js';

export default function PatientDetailPage() {
  const { t } = useI18n();
  const formatDate = useFormatDate();
  const { id } = useParams();
  const patientId = Number(id);

  const [patient, setPatient]           = useState(null);
  const [notes, setNotes]               = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices]         = useState([]);
  const [loading, setLoading]           = useState(true);

  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [p, n, a, i] = await Promise.all([
        Patients.get(patientId),
        Patients.notes(patientId),
        Appointments.list({ patient_id: patientId }),
        Invoices.list({ patient_id: patientId }),
      ]);
      setPatient(p);
      setNotes(n);
      setAppointments(a);
      setInvoices(i);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [patientId]);

  async function addNote(e) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await Notes.create({ patient_id: patientId, content: newNote.trim() });
      setNewNote('');
      await refresh();
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) return <div className="p-10 text-slate-500">{t('common.loading')}</div>;
  if (!patient) return <div className="p-10 text-slate-500">{t('patients.detail.notFound')}</div>;

  return (
    <>
      <PageHeader
        title={patient.name}
        subtitle={`${t('common.patient')} #${patient.id} · ${patient.phone || t('patients.detail.noPhone')}`}
        actions={<Link to="/patients" className="btn-secondary">{t('patients.detail.allPatients')}</Link>}
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <section className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('patients.detail.contact')}</h3>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500">{t('common.phone')}</dt><dd>{patient.phone || t('common.dash')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('common.email')}</dt><dd>{patient.email || t('common.dash')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('common.joined')}</dt><dd>{formatDate(new Date(patient.created_at), 'MMM d, yyyy')}</dd></div>
            </dl>
            {patient.clinical_notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-1">{t('patients.detail.profileNote')}</div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{patient.clinical_notes}</p>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('patients.detail.quickStats')}</h3>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500">{t('nav.appointments')}</dt><dd>{appointments.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('common.notes')}</dt><dd>{notes.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('patients.detail.unpaidInvoices')}</dt><dd>{invoices.filter((i) => i.status === 'unpaid').length}</dd></div>
            </dl>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="card">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">{t('patients.detail.notesTitle')}</h3>
            </div>
            <form onSubmit={addNote} className="px-6 py-4 border-b border-slate-200 space-y-3">
              <textarea
                className="input"
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t('patients.detail.notePlaceholder')}
              />
              <div className="flex justify-end">
                <button className="btn-primary" disabled={savingNote || !newNote.trim()}>
                  {savingNote ? t('common.saving') : t('patients.detail.addNote')}
                </button>
              </div>
            </form>
            {notes.length === 0 ? (
              <div className="px-6 py-8 text-sm text-slate-500 text-center">{t('patients.detail.noNotes')}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notes.map((n) => (
                  <li key={n.id} className="px-6 py-4">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.content}</p>
                    <div className="text-xs text-slate-400 mt-1">
                      {n.created_by || 'system'} · {formatDate(new Date(n.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">{t('patients.detail.history')}</h3>
            </div>
            {appointments.length === 0 ? (
              <div className="px-6 py-8 text-sm text-slate-500 text-center">{t('patients.detail.noAppointments')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-6 py-3">{t('common.when')}</th>
                    <th className="text-left px-6 py-3">{t('common.doctor')}</th>
                    <th className="text-left px-6 py-3">{t('common.channel')}</th>
                    <th className="text-left px-6 py-3">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-6 py-3">{formatDate(new Date(a.appointment_time), 'MMM d, yyyy HH:mm')}</td>
                      <td className="px-6 py-3 text-slate-600">{a.doctor_name}</td>
                      <td className="px-6 py-3"><ChannelPill channel={a.channel} /></td>
                      <td className="px-6 py-3"><StatusPill status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">{t('patients.detail.invoices')}</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="px-6 py-8 text-sm text-slate-500 text-center">{t('patients.detail.noInvoices')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-6 py-3">{t('common.date')}</th>
                    <th className="text-left px-6 py-3">{t('common.amount')}</th>
                    <th className="text-left px-6 py-3">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((i) => (
                    <tr key={i.id}>
                      <td className="px-6 py-3">{formatDate(new Date(i.created_at), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-3 font-medium">${Number(i.amount).toFixed(2)}</td>
                      <td className="px-6 py-3"><StatusPill status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
