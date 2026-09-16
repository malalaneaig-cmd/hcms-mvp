import { format } from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { useI18n } from './I18nProvider.jsx';

export function useFormatDate() {
  const { locale } = useI18n();
  const dateLocale = locale === 'pt-PT' ? pt : enUS;

  return (date, fmt) => format(date, fmt, { locale: dateLocale });
}
