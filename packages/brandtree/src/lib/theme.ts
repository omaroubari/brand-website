/** @file Browser theme store: persistence, OS observation, and DOM reflection. */
import {
  isThemeSetting,
  resolveThemePreference,
  resolveThemeState,
} from "./theme-state";
import type { Theme, ThemeSetting, ThemeState } from "./theme-state";

export type { Theme, ThemeSetting, ThemeState } from "./theme-state";

declare global {
  interface Window {
    /** Published by ThemeScript.astro before this module runs. */
    defaultTheme: ThemeSetting;
  }
}

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

let state: ThemeState | undefined;
let initialized = false;
let systemPreference: MediaQueryList | undefined;

function getBrandDefault(): ThemeSetting {
  return isThemeSetting(window.defaultTheme) ? window.defaultTheme : "system";
}

function getStoredThemeSetting(): ThemeSetting | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return isThemeSetting(value) ? value : null;
}

function getSystemTheme(): Theme {
  return getSystemPreference().matches ? "dark" : "light";
}

function getSystemPreference(): MediaQueryList {
  systemPreference ??= window.matchMedia("(prefers-color-scheme: dark)");
  return systemPreference;
}

function calculateThemeState(): ThemeState {
  const preference = resolveThemePreference(
    getStoredThemeSetting(),
    getBrandDefault(),
  );
  return resolveThemeState(preference, getSystemTheme());
}

function reflectTheme(nextState: ThemeState): void {
  document.documentElement.setAttribute("data-theme", nextState.theme);
  document.documentElement.setAttribute(
    "data-theme-preference",
    nextState.preference,
  );
  document.documentElement.style.colorScheme = nextState.theme;
}

function publishTheme(): void {
  const nextState = calculateThemeState();
  const changed =
    !state ||
    state.theme !== nextState.theme ||
    state.preference !== nextState.preference ||
    state.systemTheme !== nextState.systemTheme;

  state = nextState;
  reflectTheme(nextState);
  if (changed) listeners.forEach((listener) => listener());
}

function initialize(): void {
  if (initialized) return;
  initialized = true;

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) publishTheme();
  });
  getSystemPreference().addEventListener("change", publishTheme);
  document.addEventListener("astro:after-swap", publishTheme);
  publishTheme();
}

/** Return the store's stable current snapshot for useSyncExternalStore. */
export function getThemeState(): ThemeState {
  initialize();
  if (!state) throw new Error("Theme store failed to initialize");
  return state;
}

/** Subscribe to resolved theme changes. */
export function subscribeToTheme(listener: () => void): () => void {
  initialize();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Set a visitor preference, or pass null to return to the brand default. */
export function setThemePreference(preference: ThemeSetting | null): void {
  if (preference === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, preference);
  publishTheme();
}

if (typeof window !== "undefined") initialize();
