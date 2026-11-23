import { useTranslation } from "react-i18next";
import {
  SUPPORTED_LANGUAGES,
  setLanguage,
  type SupportedLanguage,
} from "../../i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current: SupportedLanguage =
    SUPPORTED_LANGUAGES.find((language) => language === i18n.language) ?? "fr";

  return (
    <div className="lang" role="group" aria-label={t("common.language")}>
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          className="lang__option"
          lang={language}
          aria-pressed={language === current}
          onClick={() => setLanguage(language)}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
