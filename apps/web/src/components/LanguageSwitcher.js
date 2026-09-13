import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage } from '../i18n/index.js';
/** Always visible, and the choice is remembered between sessions. */
export function LanguageSwitcher() {
    const { i18n, t } = useTranslation();
    return (_jsx("select", { className: "!w-auto", value: i18n.language, onChange: (e) => setLanguage(e.target.value), "aria-label": t('lang.label'), title: t('lang.label'), children: LANGUAGES.map((l) => (_jsx("option", { value: l.code, children: l.label }, l.code))) }));
}
