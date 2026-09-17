import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

function isoToDisplay(iso, locale) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return locale === 'pt-PT' ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
}

function parseDisplay(text, locale) {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const first = parseInt(match[1], 10);
  const second = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const month = locale === 'pt-PT' ? second : first;
  const day = locale === 'pt-PT' ? first : second;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;

  return iso;
}

/** Text date field: PT = dd/mm/aaaa, EN = mm/dd/yyyy. Emits ISO yyyy-mm-dd to parent. */
export default function LocaleDateInput({ value, onChange, min, max, required, className = 'input' }) {
  const { locale, t } = useI18n();
  const [text, setText] = useState(() => isoToDisplay(value, locale));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(isoToDisplay(value, locale));
    setInvalid(false);
  }, [value, locale]);

  function tryParse(next) {
    if (!next.trim()) {
      setInvalid(false);
      onChange('');
      return;
    }
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(next.trim())) {
      onChange('');
      return;
    }
    const iso = parseDisplay(next, locale);
    if (!iso || (min && iso < min) || (max && iso > max)) {
      setInvalid(true);
      onChange('');
      return;
    }
    setInvalid(false);
    onChange(iso);
  }

  const placeholder = locale === 'pt-PT' ? 'dd/mm/aaaa' : 'mm/dd/yyyy';

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        className={`${className}${invalid ? ' border-red-400 focus:ring-red-300' : ''}`}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          setInvalid(false);
          tryParse(next);
        }}
        onBlur={(e) => tryParse(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={invalid}
      />
      {invalid && (
        <p className="text-xs text-red-600 mt-1">{t('booking.dateInvalid')}</p>
      )}
    </>
  );
}
