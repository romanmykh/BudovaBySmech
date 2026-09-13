import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import cs from './locales/cs.json';
import uk from './locales/uk.json';
import pl from './locales/pl.json';
import ru from './locales/ru.json';

/** The five languages this tool supports. No others are offered. */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'cs', label: 'Čeština' },
  { code: 'uk', label: 'Українська' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'budova.lang';

function initialLanguage(): LangCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as LangCode;
  } catch {
    /* private mode */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'cs';
  const match = LANGUAGES.find((l) => l.code === nav);
  return (match?.code ?? 'cs') as LangCode;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    cs: { translation: cs },
    uk: { translation: uk },
    pl: { translation: pl },
    ru: { translation: ru },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(code: LangCode): void {
  void i18n.changeLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = code;
}

document.documentElement.lang = i18n.language;

export default i18n;
