import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  getThemeState,
  setThemePreference,
  subscribeToTheme,
} from "@/lib/theme";
import { resolveThemeState } from "@/lib/theme-state";
import type { Theme, ThemeSetting, ThemeState } from "@/lib/theme-state";

export interface UseThemeResult extends ThemeState {
  isDark: boolean;
  isSystem: boolean;
  /** Set light, dark, or system; pass null to return to the brand default. */
  setTheme: (preference: ThemeSetting | null) => void;
  /** Flip between explicit light and dark based on the resolved theme. */
  toggleTheme: () => void;
}

/** Adapt the browser theme store to React with one shared state subscription. */
export function useTheme({
  defaultTheme = "system",
}: { defaultTheme?: ThemeSetting } = {}): UseThemeResult {
  const serverState = useMemo(
    () => resolveThemeState(defaultTheme, getServerSystemTheme()),
    [defaultTheme],
  );
  const getServerSnapshot = useCallback(() => serverState, [serverState]);
  const state = useSyncExternalStore(
    subscribeToTheme,
    getThemeState,
    getServerSnapshot,
  );

  const toggleTheme = useCallback(() => {
    setThemePreference(state.theme === "dark" ? "light" : "dark");
  }, [state.theme]);

  return {
    ...state,
    isDark: state.theme === "dark",
    isSystem: state.preference === "system",
    setTheme: setThemePreference,
    toggleTheme,
  };
}

function getServerSystemTheme(): Theme {
  // The CSS media-query fallback resolves a system default before JavaScript.
  return "light";
}
