import { LOCALE_COOKIE_NAME } from "../core/i18n";

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/gu,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const scriptJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</gu, "\\u003c");

/** A static entry page can honor the locale cookie without a server adapter. */
export const localeRedirectHtml = (
  routes: Record<string, string>,
  defaultLocale: string,
): string => {
  const fallback = routes[defaultLocale]!;
  return `<!doctype html><html lang="${escapeHtml(defaultLocale)}"><head><meta charset="utf-8"><script>
const routes = ${scriptJson(routes)};
const cookie = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(${scriptJson(`${LOCALE_COOKIE_NAME}=`)}));
let locale = ${scriptJson(defaultLocale)};
try { if (cookie) locale = decodeURIComponent(cookie.slice(${LOCALE_COOKIE_NAME.length + 1})); } catch {}
location.replace(Object.hasOwn(routes, locale) ? routes[locale] : ${scriptJson(fallback)});
</script><noscript><meta http-equiv="refresh" content="0;url=${escapeHtml(fallback)}"></noscript></head><body><a href="${escapeHtml(fallback)}">${escapeHtml(defaultLocale)}</a></body></html>`;
};
