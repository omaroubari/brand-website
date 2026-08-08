import { getCollection, type CollectionEntry } from 'astro:content';

export type Section = CollectionEntry<'sections'>;

export interface SectionLink {
	id: string;
	href: string;
	title: string;
	summary?: string;
	/** Two-digit section number, "01". */
	number: string;
}

/** Filename prefix (`03-logo.mdx` → 3) — the running order, unless frontmatter overrides it. */
function orderOf(entry: Section): number {
	if (typeof entry.data.order === 'number') return entry.data.order;
	const prefix = entry.filePath?.match(/(\d+)[-_][^/]*\.mdx?$/)?.[1];
	return prefix ? Number(prefix) : Number.MAX_SAFE_INTEGER;
}

/**
 * Every published section, in document order.
 *
 * Drafts are excluded from production builds but kept during `astro dev` so you
 * can preview what you are writing.
 */
export async function getSections(): Promise<Section[]> {
	const entries = await getCollection('sections', ({ data }) => import.meta.env.DEV || !data.draft);
	return entries.sort((a, b) => orderOf(a) - orderOf(b));
}

export function sectionNumber(entry: Section, index: number): string {
	return entry.data.number ?? String(orderOf(entry) === Number.MAX_SAFE_INTEGER ? index + 1 : orderOf(entry)).padStart(2, '0');
}

export function toLink(entry: Section, index: number): SectionLink {
	return {
		id: entry.id,
		href: `/${entry.id}`,
		title: entry.data.title,
		summary: entry.data.summary,
		number: sectionNumber(entry, index),
	};
}

/** Ordered nav entries — used by the rail, the contents list and the pager. */
export async function getSectionLinks(): Promise<SectionLink[]> {
	return (await getSections()).map(toLink);
}

/** Previous and next sections relative to `id`, for the pager. */
export async function getSiblings(id: string): Promise<{ prev?: SectionLink; next?: SectionLink }> {
	const links = await getSectionLinks();
	const i = links.findIndex((l) => l.id === id);
	if (i === -1) return {};
	return { prev: links[i - 1], next: links[i + 1] };
}
