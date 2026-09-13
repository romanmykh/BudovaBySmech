import { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, type LangCode } from '../i18n/index.js';

/** Always visible, and the choice is remembered between sessions. */
export function LanguageSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation();
  return (
    <select
      className="!w-auto"
      value={i18n.language}
      onChange={(e) => setLanguage(e.target.value as LangCode)}
      aria-label={t('lang.label')}
      title={t('lang.label')}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
