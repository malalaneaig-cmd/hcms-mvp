import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { Doctors } from '../services/api.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

const WEEKDAY_IDS = [0, 1, 2, 3, 4, 5, 6];

function emptyDaySchedule() {
  return {
    morning:   { on: false, start: '08:00', end: '12:00' },
    afternoon: { on: false, start: '14:00', end: '16:30' },
  };
}

function scheduleToForm(blocks) {
  const form = Object.fromEntries(WEEKDAY_IDS.map((id) => [id, emptyDaySchedule()]));
  for (const block of blocks) {
    const day = form[block.weekday];
    if (!day) continue;
    const start = block.start_time.slice(0, 5);
    const end = block.end_time.slice(0, 5);
    const startMin = parseInt(start.slice(0, 2), 10) * 60 + parseInt(start.slice(3), 10);
    if (startMin < 13 * 60) {
      day.morning = { on: true, start, end };
    } else {
      day.afternoon = { on: true, start, end };
    }
  }
  return form;
}

function formToBlocks(form) {
  const blocks = [];
  for (const id of WEEKDAY_IDS) {
    const d = form[id];
    if (d.morning.on) blocks.push({ weekday: id, start_time: d.morning.start, end_time: d.morning.end });
    if (d.afternoon.on) blocks.push({ weekday: id, start_time: d.afternoon.start, end_time: d.afternoon.end });
  }
  return blocks;
}

function summarizeSchedule(blocks, t) {
  if (!blocks?.length) return t('doctors.noSchedule');
  const byDay = {};
  for (const b of blocks) {
    byDay[b.weekday] = byDay[b.weekday] || [];
    byDay[b.weekday].push(`${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)}`);
  }
  return WEEKDAY_IDS
    .filter((id) => byDay[id])
    .map((id) => `${t(`weekdaysShort.${id}`)} ${byDay[id].join(', ')}`)
    .join(' · ');
}

export default function DoctorsPage() {
  const { t } = useI18n();
  const { canManageClinic, canManageDoctorSchedule } = usePermissions();
  const [list, setList] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [scheduleDoctor, setScheduleDoctor] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const doctors = await Doctors.list();
      setList(doctors);
      const scheduleEntries = await Promise.all(
        doctors.map(async (d) => {
          try {
            const blocks = await Doctors.getSchedule(d.id);
            return [d.id, blocks];
          } catch {
            return [d.id, []];
          }
        })
      );
      setSchedules(Object.fromEntries(scheduleEntries));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <>
      <PageHeader
        title={t('doctors.title')}
        subtitle={t('doctors.subtitle')}
        actions={
          canManageClinic ? (
            <button className="btn-primary" onClick={() => setOpen(true)}>{t('doctors.add')}</button>
          ) : null
        }
      />

      <div className="p-8">
        {loading ? (
          <div className="text-slate-500">{t('common.loading')}</div>
        ) : list.length === 0 ? (
          <div className="card p-10 text-center text-slate-500">{t('doctors.none')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((d) => (
              <div key={d.id} className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-brand-100 grid place-items-center text-xl">👨‍⚕️</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{d.name}</div>
                    <div className="text-sm text-slate-500 truncate">{d.specialty || 'General'}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {summarizeSchedule(schedules[d.id], t)}
                </p>
                {canManageDoctorSchedule(d.id) ? (
                  <button className="btn-secondary w-full" onClick={() => setScheduleDoctor(d)}>
                    {t('doctors.editHours')}
                  </button>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-2">{t('doctors.viewOnlySchedule')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <NewDoctorModal open={open} onClose={() => setOpen(false)} onCreated={refresh} />
      <ScheduleModal
        doctor={scheduleDoctor}
        onClose={() => setScheduleDoctor(null)}
        onSaved={refresh}
      />
    </>
  );
}

function NewDoctorModal({ open, onClose, onCreated }) {
  const { t } = useI18n();
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
      setError(err.response?.data?.error || t('doctors.modal.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('doctors.modal.addTitle')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.create')}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">{t('common.name')} *</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="label">{t('doctors.modal.specialty')}</label>
          <input className="input" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} placeholder={t('doctors.modal.specialtyPh')} />
        </div>
        <p className="text-xs text-slate-500">{t('doctors.modal.defaultHours')}</p>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
      </form>
    </Modal>
  );
}

function ScheduleModal({ doctor, onClose, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctor) { setForm(null); return; }
    setError('');
    Doctors.getSchedule(doctor.id)
      .then((blocks) => setForm(scheduleToForm(blocks)))
      .catch(() => setForm(scheduleToForm([])));
  }, [doctor]);

  const blocksPreview = useMemo(() => (form ? formToBlocks(form) : []), [form]);

  function applyWeekdayTemplate() {
    setForm((prev) => {
      const next = { ...prev };
      for (const day of [1, 2, 3, 4, 5]) {
        next[day] = {
          morning:   { on: true, start: '08:00', end: '12:00' },
          afternoon: { on: true, start: '14:00', end: '16:30' },
        };
      }
      return next;
    });
  }

  function updateBlock(dayId, period, field, value) {
    setForm((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [period]: { ...prev[dayId][period], [field]: value },
      },
    }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!doctor) return;
    setSaving(true);
    setError('');
    try {
      await Doctors.saveSchedule(doctor.id, blocksPreview);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('doctors.schedule.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!doctor}
      onClose={onClose}
      title={doctor ? t('doctors.schedule.title', { name: doctor.name }) : t('doctors.editHours')}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving || !form}>
            {saving ? t('common.saving') : t('doctors.schedule.save')}
          </button>
        </>
      }
    >
      {!form ? (
        <div className="text-slate-500">{t('doctors.schedule.loading')}</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">{t('doctors.schedule.hint')}</p>
            <button type="button" className="btn-secondary text-xs" onClick={applyWeekdayTemplate}>
              {t('doctors.schedule.applyTemplate')}
            </button>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {WEEKDAY_IDS.map((id) => (
              <div key={id} className="border border-slate-200 rounded-lg p-3">
                <div className="font-medium text-sm text-slate-800 mb-2">{t(`weekdays.${id}`)}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {['morning', 'afternoon'].map((period) => (
                    <div key={period} className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-2 min-w-[90px]">
                        <input
                          type="checkbox"
                          checked={form[id][period].on}
                          onChange={(e) => updateBlock(id, period, 'on', e.target.checked)}
                        />
                        {period === 'morning' ? t('doctors.schedule.morning') : t('doctors.schedule.afternoon')}
                      </label>
                      <input
                        type="time"
                        className="input py-1 text-xs w-[110px]"
                        value={form[id][period].start}
                        disabled={!form[id][period].on}
                        onChange={(e) => updateBlock(id, period, 'start', e.target.value)}
                      />
                      <span className="text-slate-400">–</span>
                      <input
                        type="time"
                        className="input py-1 text-xs w-[110px]"
                        value={form[id][period].end}
                        disabled={!form[id][period].on}
                        onChange={(e) => updateBlock(id, period, 'end', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        </form>
      )}
    </Modal>
  );
}
