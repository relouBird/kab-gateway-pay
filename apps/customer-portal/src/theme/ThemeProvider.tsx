import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "kgpay.theme";
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(
  preference: string | null,
  prefersDark: boolean,
): Theme {
  if (preference === "light" || preference === "dark") return preference;
  return prefersDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    resolveTheme(storedTheme(), systemTheme() === "dark"),
  );
  const [hasPreference, setHasPreference] = useState(
    () => storedTheme() !== null,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      if (!hasPreference) setThemeState(systemTheme());
    };
    const syncStoredTheme = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const preference = event.key === STORAGE_KEY ? event.newValue : null;
      setHasPreference(preference === "light" || preference === "dark");
      setThemeState(
        resolveTheme(preference, media?.matches ?? systemTheme() === "dark"),
      );
    };

    media?.addEventListener("change", updateSystemTheme);
    window.addEventListener("storage", syncStoredTheme);
    return () => {
      media?.removeEventListener("change", updateSystemTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, [hasPreference]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setHasPreference(true);
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The selected theme remains active for this page even if storage is unavailable.
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider.");
  return value;
}
