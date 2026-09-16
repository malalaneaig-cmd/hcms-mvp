import { useEffect, useState } from 'react';
import { Appointments } from '../services/api.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

export default function SlotPicker({ doctorId, date, value, onChange, channel = 'website', className = '' }) {
  const { t } = useI18n();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      setError('');
      onChange?.('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    Appointments.slots(Number(doctorId), date, channel)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots || []);
        if (value && !(res.slots || []).includes(value)) onChange?.('');
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setError(t('slotPicker.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [doctorId, date, channel, t]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!doctorId || !date) {
    return <p className="text-sm text-slate-500">{t('slotPicker.selectFirst')}</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-500">{t('slotPicker.loading')}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        {t('slotPicker.noSlots')}
      </p>
    );
  }

  return (
    <div className={`grid grid-cols-3 sm:grid-cols-4 gap-2 ${className}`}>
      {slots.map((slotTime) => (
        <button
          key={slotTime}
          type="button"
          onClick={() => onChange?.(slotTime)}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
            value === slotTime
              ? 'border-brand-600 bg-brand-50 text-brand-800 font-medium'
              : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
          }`}
        >
          {slotTime}
        </button>
      ))}
    </div>
  );
}
