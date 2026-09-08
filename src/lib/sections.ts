import { getCollection, type CollectionEntry } from "astro:content";
import { defaultLocale, supportedLocales, type Locale } from "../i18n";

export { defaultLocale, supportedLocales };
export type { Locale };

export type Section = CollectionEntry<"sections">;

export interface SectionLink {
  id: string;
  locale: Locale;
  href: string;
  title: string;
  summary?: string;
  /** Two-digit section number, "01". */
  number: string;
}

function isLocale(value: string): value is Locale {
  return (supportedLocales as readonly string[]).includes(value);
}

/** Locale encoded by the content ID (`en/logo`). */
export function sectionLocale(entry: Section): Locale {
  const candidate = entry.id.split("/", 1)[0];
  return isLocale(candidate) ? candidate : defaultLocale;
}

/** Stable URL slug without the locale prefix (`en/logo` → `logo`). */
export function sectionSlug(entryOrId: Section | string): string {
  const id = typeof entryOrId === "string" ? entryOrId : entryOrId.id;
  const [candidate, ...rest] = id.split("/");
  return rest.length > 0 && isLocale(candidate) ? rest.join("/") : id;
}

/** Filename prefix (`03-logo.mdx` → 3) — the running order, unless frontmatter overrides it. */
function orderOf(entry: Section): number {
  if (typeof entry.data.order === "number") return entry.data.order;
  const prefix = entry.filePath?.match(/(\d+)[-_][^/]*\.mdx?$/)?.[1];
  return prefix ? Number(prefix) : Number.MAX_SAFE_INTEGER;
}

/**
 * Every published section, in document order.
 *
 * Drafts are excluded from production builds but kept during `astro dev` so you
 * can preview what you are writing.
 */
export async function getSections(
  locale: Locale = defaultLocale,
): Promise<Section[]> {
  const entries = await getCollection(
    "sections",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  return entries
    .filter((entry) => sectionLocale(entry) === locale)
    .sort((a, b) => orderOf(a) - orderOf(b));
}

export function sectionNumber(entry: Section, index: number): string {
  return (
    entry.data.number ??
    String(
      orderOf(entry) === Number.MAX_SAFE_INTEGER ? index + 1 : orderOf(entry),
    ).padStart(2, "0")
  );
}

export function toLink(entry: Section, index: number): SectionLink {
  const locale = sectionLocale(entry);
  const id = sectionSlug(entry);
  return {
    id,
    locale,
    href: `/${locale}/${id}`,
    title: entry.data.title,
    summary: entry.data.summary,
    number: sectionNumber(entry, index),
  };
}

/** Ordered nav entries — used by the rail, the contents list and the pager. */
export async function getSectionLinks(
  locale: Locale = defaultLocale,
): Promise<SectionLink[]> {
  return (await getSections(locale)).map(toLink);
}

/** Previous and next sections relative to `id`, for the pager. */
export async function getSiblings(
  id: string,
  locale: Locale = defaultLocale,
): Promise<{ prev?: SectionLink; next?: SectionLink }> {
  const links = await getSectionLinks(locale);
  const i = links.findIndex((l) => l.id === sectionSlug(id));
  if (i === -1) return {};
  return { prev: links[i - 1], next: links[i + 1] };
}
