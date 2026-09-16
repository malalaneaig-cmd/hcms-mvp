import { useI18n } from '../i18n/I18nProvider.jsx';

export default function StaffOnlyGate() {
  const { t } = useI18n();
  return (
    <div className="p-10">
      <div className="card p-10 text-center">
        <div className="text-3xl mb-3">🔒</div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('permissions.staffOnly')}</h2>
        <p className="text-sm text-slate-500">{t('permissions.staffOnlyHint')}</p>
      </div>
    </div>
  );
}
