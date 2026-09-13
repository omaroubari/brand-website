import type { UIStrings } from "../i18n";
import type { BrandConfig } from "../brand/schema";
import type { Heading, Navigation, PageRecord } from "./types";

/**
 * The complete page-shell contract. Route files prepare these values and
 * intermediate layouts forward them unchanged to RootLayout.
 */
interface RootLayoutBaseProps {
  brand: BrandConfig;
  site: { title: string; description?: string };
  logo?: {
    svg?: string;
    light?: string;
    dark?: string;
    alt: string;
    href: string;
    text?: string;
  } | null;
  favicon?: string | null;
  appleIcon?: string | null;
  banner?: {
    content: string;
    link?: { text: string; href: string };
    dismissible: boolean;
    key: string;
  } | null;
  analytics?: {
    posthog?: { host?: string; key: string };
    scripts?: {
      attributes?: Record<string, string>;
      content?: string;
      src?: string;
      strategy?: "async" | "defer";
    }[];
    vercel?: boolean;
  } | null;
  navigation: Navigation;
  navigationNumbering: boolean;
  mcp?: { name: string; route: string } | null;
  imageZoom?: boolean;
  codeWrap?: boolean;
  themeMode: "system" | "light" | "dark";
  searchEnabled: boolean;
  indexable: boolean;
  ogImage?: string | null;
  ogGenerated?: boolean;
  x?: { creator?: string; handle?: string };
  canonical?: string | null;
  editUrl?: string | null;
  askEnabled?: boolean;
  feedback?: boolean;
  exportPdf?: boolean;
  exportEpub?: boolean;
  openInChat?: readonly string[];
  feeds?: { title: string; href: string }[];
  discovery?: { agentReadability: boolean; llmsTxt: boolean } | null;
  siteUrl?: string | null;
  pageType?: string;
  published?: string | Date | null;
  lastModified?: string | null;
  noindex?: boolean;
  structuredDataEnabled?: boolean;
  locale?: string;
  dir?: "ltr" | "rtl";
  contentDir?: "ltr" | "rtl";
  ui: UIStrings;
  localeAlternates?: { hreflang: string; href: string }[];
  xDefault?: string | null;
  versionNotice?: {
    message: string;
    latestHref: string;
    latestLabel: string;
  } | null;
  searchVersion?: string | null;
}

type RootPage = { title: string; description?: string; route: string };
type TocSettings = { enabled: boolean; maxLevel: number; minLevel: number };

/** A content page carries the full record required by its opener and pager. */
export type ContentRootLayoutProps = RootLayoutBaseProps & {
  contentLayout?: "content";
  page: PageRecord;
  headings: Heading[];
  toc?: TocSettings;
};

/** Bare pages render their slot directly and need no content-page furniture. */
export type BareRootLayoutProps = RootLayoutBaseProps & {
  contentLayout: "bare";
  page: RootPage;
  headings?: never;
  toc?: never;
};

export type RootLayoutProps = ContentRootLayoutProps | BareRootLayoutProps;
