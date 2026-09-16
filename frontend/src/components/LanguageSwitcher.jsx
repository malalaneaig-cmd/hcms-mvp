import { LOCALES } from '../i18n/I18nProvider.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

export default function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={`inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium ${className}`}>
      {Object.entries(LOCALES).map(([code, meta]) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            locale === code ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
          aria-label={meta.label}
        >
          {meta.label}
        </button>
      ))}
    </div>
  );
}
