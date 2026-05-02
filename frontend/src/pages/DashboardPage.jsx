import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfDay, endOfDay } from 'date-fns';
import PageHeader from '../components/PageHeader.jsx';
import StatusPill, { ChannelPill } from '../components/StatusPill.jsx';
import { Appointments, Patients, Invoices } from '../services/api.js';

function StatCard({ label, value, hint, color = 'brand' }) {
  const colorMap = {
    brand:   'bg-brand-50 text-brand-700',
    green:   'bg-emerald-50 text-emerald-700',
    yellow:  'bg-amber-50 text-amber-700',
    purple:  'bg-purple-50 text-purple-700',
  };
  return (
    <div className="card p-5">
      <div className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md ${colorMap[color]}`}>{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [todays, setTodays]      = useState([]);
  const [patientCount, setPC]    = useState(0);
  const [unpaidCount, setUC]     = useState(0);
  const [unpaidTotal, setUT]     = useState(0);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    const from = startOfDay(new Date()).toISOString();
    const to   = endOfDay(new Date()).toISOString();
    Promise.all([
      Appointments.list({ from, to }),
      Patients.list(),
      Invoices.list({ status: 'unpaid' }),
    ])
      .then(([appts, patients, invoices]) => {
        setTodays(appts);
        setPC(patients.length);
        setUC(invoices.length);
        setUT(invoices.reduce((sum, i) => sum + Number(i.amount), 0));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's appointments" value={todays.length}                                            hint="all channels"                color="brand" />
          <StatCard label="Total patients"       value={patientCount}                                              hint="across the system"           color="purple" />
          <StatCard label="Unpaid invoices"      value={unpaidCount}                                               hint="pending payment"             color="yellow" />
          <StatCard label="Outstanding"          value={`$${unpaidTotal.toFixed(2)}`}                              hint="total unpaid amount"         color="green" />
        </div>

        <section className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-base">Today's schedule</h2>
              <p className="text-xs text-slate-500">All bookings for {format(new Date(), 'MMM d')}</p>
            </div>
            <Link to="/appointments" className="btn-secondary">View all →</Link>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">Loading…</div>
          ) : todays.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">
              No appointments scheduled today.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Time</th>
                  <th className="text-left px-6 py-3">Patient</th>
                  <th className="text-left px-6 py-3">Doctor</th>
                  <th className="text-left px-6 py-3">Channel</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todays.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium">{format(new Date(a.appointment_time), 'HH:mm')}</td>
                    <td className="px-6 py-3">{a.patient_name}</td>
                    <td className="px-6 py-3 text-slate-600">{a.doctor_name}</td>
                    <td className="px-6 py-3"><ChannelPill channel={a.channel} /></td>
                    <td className="px-6 py-3"><StatusPill status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/appointments" className="card p-5 hover:shadow-card transition-shadow">
            <div className="text-2xl">📅</div>
            <div className="mt-2 font-medium">Book appointment</div>
            <div className="text-xs text-slate-500 mt-1">Reception or phone channel</div>
          </Link>
          <Link to="/patients" className="card p-5 hover:shadow-card transition-shadow">
            <div className="text-2xl">🧑</div>
            <div className="mt-2 font-medium">Add patient</div>
            <div className="text-xs text-slate-500 mt-1">New record in the system</div>
          </Link>
          <Link to="/invoices" className="card p-5 hover:shadow-card transition-shadow">
            <div className="text-2xl">💰</div>
            <div className="mt-2 font-medium">Create invoice</div>
            <div className="text-xs text-slate-500 mt-1">Basic billing for visits</div>
          </Link>
        </section>
      </div>
    </>
  );
}
