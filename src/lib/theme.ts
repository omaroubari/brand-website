export type Theme = "light" | "dark";
export type ThemeSetting = Theme | "system";

declare const defaultTheme: ThemeSetting;

declare global {
  interface DocumentEventMap {
    "set-theme": CustomEvent<ThemeSetting | null>;
    "theme-change": Event;
  }

  interface Window {
    // Published by ThemeScript.astro before this module runs so `defaultTheme`
    // resolves as a global.
    defaultTheme: ThemeSetting;
  }
}

export interface Props {
  defaultTheme?: ThemeSetting;
}

const STORAGE_KEY = "theme";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function isThemeSetting(value: string | null): value is ThemeSetting {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredThemeSetting(): ThemeSetting | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return isThemeSetting(value) ? value : null;
}

function getSystemPreference(): Theme {
  return prefersDark.matches ? "dark" : "light";
}

function resolveTheme(setting?: ThemeSetting | null): Theme {
  const activeSetting = setting ?? getStoredThemeSetting() ?? defaultTheme;
  return activeSetting === "system" ? getSystemPreference() : activeSetting;
}

function getActiveThemeSetting(): ThemeSetting {
  return getStoredThemeSetting() ?? defaultTheme;
}

function writeTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-theme-preference", theme);
  document.documentElement.style.colorScheme = theme;
  document.dispatchEvent(new Event("theme-change"));
}

function handleStorageChange(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  const newSetting = isThemeSetting(event.newValue) ? event.newValue : null;
  const setting = newSetting ?? defaultTheme;
  writeTheme(resolveTheme(setting));
}

function rewriteTheme(): void {
  const setting = getActiveThemeSetting();
  writeTheme(resolveTheme(setting));
}

function handleThemeChange(event: CustomEvent<ThemeSetting | null>): void {
  if (event.detail !== null) {
    localStorage.setItem(STORAGE_KEY, event.detail);
    writeTheme(resolveTheme(event.detail));
  } else {
    localStorage.removeItem(STORAGE_KEY);
    writeTheme(resolveTheme(defaultTheme));
  }
}

document.addEventListener("set-theme", handleThemeChange);
window.addEventListener("storage", handleStorageChange);
prefersDark.addEventListener("change", () => {
  if (getActiveThemeSetting() === "system") rewriteTheme();
});
document.addEventListener("astro:after-swap", rewriteTheme);
rewriteTheme();
