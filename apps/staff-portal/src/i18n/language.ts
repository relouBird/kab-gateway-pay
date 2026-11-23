import i18n from "./index";

export function i18nLanguage(): "fr" | "en" {
  return i18n.language.toLowerCase().startsWith("en") ? "en" : "fr";
}
