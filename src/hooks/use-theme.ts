import { useCallback, useSyncExternalStore } from "react";
import type { Theme } from "@/lib/theme";

const THEME_ATTR = "data-theme";

const PREFERENCE_ATTR = "data-theme-preference";

/**
 * Subscribe to the theme state written to <html> by @/lib/theme. The module
 * reflects the resolved theme onto `data-theme` and the user's explicit choice
 * (or "" for "follow system") onto `data-theme-preference`, so a MutationObserver
 * on those attributes is our source of truth.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTR, PREFERENCE_ATTR],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot(): Theme {
  return (
    (document.documentElement.getAttribute(THEME_ATTR) as Theme) || "light"
  );
}

function getPreferenceSnapshot(): Theme | null {
  const value = document.documentElement.getAttribute(PREFERENCE_ATTR);
  return value === "light" || value === "dark" ? value : null;
}

// Rendered on the server (and the first client pass) before <html> is readable.
function getServerTheme(): Theme {
  return "light";
}

function getServerPreference(): Theme | null {
  return null;
}

function setTheme(preference: Theme | null): void {
  // @/lib/theme owns persistence + reflection; nudge it via the event it listens for.
  document.dispatchEvent(new CustomEvent("set-theme", { detail: preference }));
}

export interface UseThemeResult {
  /** The resolved theme currently applied to the document. */
  theme: Theme;
  /** The user's explicit choice, or null when following the system preference. */
  preference: Theme | null;
  isDark: boolean;
  /** True when following the system preference (no explicit choice). */
  isSystem: boolean;
  /** Set an explicit theme, or pass null to fall back to the system preference. */
  setTheme: (preference: Theme | null) => void;
  /** Flip between explicit light and dark based on the resolved theme. */
  toggleTheme: () => void;
  /**
   * Toggle between following the system preference and an explicit override:
   * from system, pin the opposite of the current theme; otherwise return to system.
   */
  toggleSystem: () => void;
}

export function useTheme(): UseThemeResult {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerTheme,
  );
  const preference = useSyncExternalStore(
    subscribe,
    getPreferenceSnapshot,
    getServerPreference,
  );

  const toggleTheme = useCallback(() => {
    setTheme(getThemeSnapshot() === "dark" ? "light" : "dark");
  }, []);

  const toggleSystem = useCallback(() => {
    // Two states: follow the system preference (the default), or pin the
    // opposite of whatever is currently shown.
    if (getPreferenceSnapshot() === null) {
      setTheme(getThemeSnapshot() === "dark" ? "light" : "dark");
    } else {
      setTheme(null);
    }
  }, []);

  return {
    theme,
    preference,
    isDark: theme === "dark",
    isSystem: preference === null,
    setTheme,
    toggleTheme,
    toggleSystem,
  };
}
