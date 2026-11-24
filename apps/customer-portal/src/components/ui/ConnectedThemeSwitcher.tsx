import { useTranslation } from "react-i18next";
import { useTheme, type Theme } from "../../theme/ThemeProvider";

const THEMES: Theme[] = ["light", "dark"];

export function ConnectedThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="connected-theme"
      role="group"
      aria-label={t("common.theme.label")}
    >
      {THEMES.map((value) => (
        <button
          key={value}
          type="button"
          aria-label={t(`common.theme.${value}Mode`)}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
        >
          {t(`common.theme.${value}Mode`)}
        </button>
      ))}
    </div>
  );
}
