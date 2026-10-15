"use client";

import { Fragment, type ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "../ui/sidebar";
import ThemeToggle from "../theme-toggle";
import type { BrandConfig } from "../../brand/schema";
import type { UIStrings } from "../../core/i18n-ui";
import type { LocaleSwitchOption } from "../../core/types";

interface SideNavBrand {
  meta: Pick<
    BrandConfig["meta"],
    "name" | "documentTitle" | "year" | "version"
  >;
  logotype: BrandConfig["logo"]["logotype"];
  defaultTheme: BrandConfig["theme"]["default"];
}

interface SideNavUi {
  brand: Pick<UIStrings["brand"], "version">;
  languageSwitcher: UIStrings["languageSwitcher"];
  nav: UIStrings["nav"];
  theme: UIStrings["theme"];
}

interface Props {
  brand: SideNavBrand;
  ui: SideNavUi;
  dir: "ltr" | "rtl";
  localeSwitch: LocaleSwitchOption[];
  navigationRoot: string;
  children: ReactNode;
  content?: ReactNode;
}

function BrandLogo({
  artwork,
  brandName,
}: {
  artwork: SideNavBrand["logotype"];
  brandName: string;
}) {
  const alt = artwork.altText ?? `${brandName} logotype`;

  return (
    <span className="">
      <img
        className="theme-light-art block h-6 w-auto"
        src={artwork.onLight}
        alt={alt}
        width="1200"
        height={Math.round(1200 / artwork.aspect)}
      />
      <img
        className="theme-dark-art hidden h-6 w-auto"
        src={artwork.onDark}
        alt=""
        aria-hidden="true"
        width="1200"
        height={Math.round(1200 / artwork.aspect)}
      />
    </span>
  );
}

export default function SideNav({
  brand,
  ui,
  dir,
  localeSwitch,
  navigationRoot,
  children,
  content,
}: Props) {
  return (
    <SidebarProvider className="min-w-0" defaultOpen>
      <Sidebar
        side={dir === "rtl" ? "right" : "left"}
        labels={ui.nav}
        className="h-full">
        <SidebarHeader>
          <div className="flex items-center justify-between ps-2 pt-2">
            <a
              className=""
              href={navigationRoot}
              aria-label={`${brand.meta.name} ${brand.meta.documentTitle}`}>
              <BrandLogo artwork={brand.logotype} brandName={brand.meta.name} />
            </a>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-(length:--text-body) font-medium">
              {ui.nav.contents}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label={ui.nav.sections}>{children}</nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-[var(--space-m)] p-[var(--space-m)]">
          <ThemeToggle defaultTheme={brand.defaultTheme} labels={ui.theme} />
          <nav
            className="flex items-center gap-2 text-[length:var(--text-caption)]"
            aria-label={ui.languageSwitcher.label}>
            {localeSwitch.map((candidate, index) => (
              <Fragment key={candidate.code}>
                {index > 0 && <span aria-hidden="true">/</span>}
                <a
                  href={candidate.href}
                  aria-current={candidate.isCurrent ? "page" : undefined}
                  data-fallback={candidate.isFallback ? "true" : undefined}
                  dir={candidate.dir}>
                  {candidate.label}
                </a>
              </Fragment>
            ))}
          </nav>
          <p className="text-[length:var(--text-caption)] leading-[var(--text-caption--line-height)] tracking-[var(--text-caption--letter-spacing)] text-[var(--muted-foreground)]">
            {brand.meta.name} © {brand.meta.year}
            <br />
            {ui.brand.version} {brand.meta.version}
          </p>
        </SidebarFooter>
      </Sidebar>

      <div className="relative min-w-0 flex-1" data-page-shell>
        <SidebarTrigger
          label={ui.nav.toggleSidebar}
          className="text-primary-foreground hover:bg-primary-foreground hover:text-primary border-primary-foreground absolute inset-s-(--page-gutter) top-(--space-m) z-30 rounded-full"
          variant="outline"
          size="icon"
        />
        {content}
      </div>
    </SidebarProvider>
  );
}
