'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import sq from './locales/sq.json';
import it from './locales/it.json';

const resources = {
  en: { translation: en },
  sq: { translation: sq },
  it: { translation: it },
};

const getInitialLng = () => {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('i18nextLng');
  return stored && ['en', 'sq', 'it'].includes(stored) ? stored : 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLng(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'sq', 'it'],
  interpolation: { escapeValue: false },
});

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    localStorage.setItem('i18nextLng', lng);
    document.documentElement.lang = lng === 'sq' ? 'sq' : lng === 'it' ? 'it' : 'en';
  });
}

export default i18n;
