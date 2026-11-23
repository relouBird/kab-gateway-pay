import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { fr } from "./locales/fr";

export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "kgpay.locale";
const FALLBACK_LANGUAGE: SupportedLanguage = "fr";

function toSupported(
  value: string | null | undefined,
): SupportedLanguage | null {
  const prefix = value?.toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.find((language) => language === prefix) ?? null;
}

/** Préférence enregistrée, sinon langue du navigateur, sinon français. */
export function detectLanguage(): SupportedLanguage {
  try {
    const stored = toSupported(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Stockage indisponible : on retombe sur la langue du navigateur.
  }
  for (const candidate of navigator.languages ?? [navigator.language]) {
    const supported = toSupported(candidate);
    if (supported) return supported;
  }
  return FALLBACK_LANGUAGE;
}

/** Langue active, bornée à celles que le backend accepte pour les e-mails (`fr` | `en`). */
export function currentLanguage(): SupportedLanguage {
  return toSupported(i18n.language) ?? FALLBACK_LANGUAGE;
}

export function setLanguage(language: SupportedLanguage): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // La préférence de langue n'est pas essentielle.
  }
  void i18n.changeLanguage(language);
}

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: detectLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
});

function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = toSupported(language) ?? FALLBACK_LANGUAGE;
}

syncDocumentLanguage(i18n.language);
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
