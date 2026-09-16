import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en.js';
import ptPT from './locales/pt-PT.js';

const STORAGE_KEY = 'hcms_locale';
export const DEFAULT_LOCALE = 'pt-PT';
export const LOCALES = {
  'pt-PT': { label: 'PT', messages: ptPT, htmlLang: 'pt' },
  en:      { label: 'EN', messages: en, htmlLang: 'en' },
};

const I18nContext = createContext(null);

function resolve(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : `{${key}}`));
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LOCALES[saved] ? saved : DEFAULT_LOCALE;
  });

  const setLocale = (next) => {
    if (!LOCALES[next]) return;
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  };

  useEffect(() => {
    document.documentElement.lang = LOCALES[locale].htmlLang;
  }, [locale]);

  const value = useMemo(() => {
    const messages = LOCALES[locale].messages;
    const t = (key, vars) => interpolate(resolve(messages, key) ?? key, vars);
    return { locale, setLocale, t, messages };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
