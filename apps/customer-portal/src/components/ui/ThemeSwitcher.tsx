import { useTranslation } from "react-i18next";
import { useTheme, type Theme } from "../../theme/ThemeProvider";

const THEMES: Theme[] = ["dark", "light"];

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="theme-switcher"
      role="group"
      aria-label={t("common.theme.label")}
    >
      {THEMES.map((value) => (
        <button
          key={value}
          type="button"
          aria-label={t(`common.theme.${value}`)}
          aria-pressed={theme === value}
          title={t(`common.theme.${value}`)}
          onClick={() => setTheme(value)}
        >
          {t(`common.theme.${value}`)}
        </button>
      ))}
    </div>
  );
}
