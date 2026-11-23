import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { fr } from "./locales/fr";

export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function languageFromBrowser(): SupportedLanguage {
  try {
    const stored = localStorage.getItem("kgpay.locale");
    if (stored === "fr" || stored === "en") return stored;
  } catch {
    // Keep browser-language detection available when storage is disabled.
  }
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";
}

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: languageFromBrowser(),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = language.toLowerCase().startsWith("en")
    ? "en"
    : "fr";
}

syncDocumentLanguage(i18n.language);
i18n.on("languageChanged", syncDocumentLanguage);

export function setLanguage(language: SupportedLanguage): void {
  try {
    localStorage.setItem("kgpay.locale", language);
  } catch {
    // Persisting the display preference is optional.
  }
  void i18n.changeLanguage(language);
}

export const changeLanguage = setLanguage;

export default i18n;
