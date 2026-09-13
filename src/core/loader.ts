import { getCollection } from "astro:content";

import config from "@/brand/config";
import type { ContentTree, PageRecord } from "@/core/types";
import {
  normalizeEntry,
  toSourceEntry,
  type NormalizeContext,
  type SourceEntry,
} from "./entries";
import { resolveFolderMeta } from "./meta";
import { normalizeBasePath } from "./paths";
import { buildContentTree } from "./tree";

export interface LoadContentTreeOptions {
  /** Archive directories are opt-in; ordinary folders are never guessed to be versions. */
  versionDirs?: readonly string[];
}

/** Astro boundary: drafts, configuration, and bundled filesystem metadata. */
export async function loadContentTree(
  options: LoadContentTreeOptions = {},
): Promise<ContentTree> {
  const { i18n } = config;
  const entries = await getCollection(
    "brandGuidelines",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );

  const source = {
    name: "filesystem",
    root: "src/content/brand-guidelines",
  };
  const sourceEntries = entries.map(toSourceEntry);
  const { pages } = normalizeSourceEntries(
    { entries: sourceEntries, source },
    {
      basePath: normalizeBasePath(),
      i18n,
      versionDirs: options.versionDirs,
    },
  );
  const contentEntriesByRef = new Map(
    entries.map((entry) => [entry.id, entry]),
  );
  for (const page of pages) {
    const contentEntry = contentEntriesByRef.get(page.source.ref);
    if (contentEntry) {
      page.collection = contentEntry.collection;
      page.entryId = contentEntry.id;
    }
  }
  const modules = import.meta.glob<unknown>(
    "../../content/brand-guidelines/**/meta{,.$}.{ts,js,mjs}",
    { import: "default" },
  );

  const localeDirs =
    config.i18n && config.i18n.parser === "dir"
      ? config.i18n.locales.flatMap((locale) =>
          locale.code === config.i18n?.defaultLocale ? [] : [locale.code],
        )
      : undefined;

  const { meta, shared } = await resolveFolderMeta(
    [
      {
        root: "src/content/brand-guidelines",
        modules: Object.fromEntries(
          Object.entries(modules).map(([path, load]) => [
            path.replace("../../content/brand-guidelines/", ""),
            load,
          ]),
        ),
      },
    ],
    { localeDirs: i18n ? localeDirs : [], versionDirs: options.versionDirs },
  );

  const contentTree = buildContentTree(pages, {
    i18n,
    folderMeta: meta,
    sharedFolderMeta: shared,
    navigation: {},
  });
  return contentTree;
}

/** Funnel one loaded source's entries through the shared `normalizeEntry`. */
export const normalizeSourceEntries = (
  {
    entries,
    source,
  }: {
    entries: readonly SourceEntry[];
    source: { name: string; root: string; prefix?: string };
  },
  options: Omit<NormalizeContext, "source"> = {},
): { pages: PageRecord[] } => {
  const pages: PageRecord[] = [];

  for (const entry of entries) {
    const normalized = normalizeEntry(entry, {
      ...options,
      source: {
        name: source.name,
        prefix: source.prefix,
        root: source.root,
      },
    });

    pages.push(...normalized.pages);
  }

  return { pages };
};
