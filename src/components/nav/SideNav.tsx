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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/theme-toggle";
import { brand } from "../../brand/config";
import type { SectionLink } from "../../lib/sections";
import {
  getLocalizedPath,
  getUi,
  localeInfo,
  supportedLocales,
  getDirection,
  resolveBrand,
  type Locale,
} from "../../i18n";

interface Props {
  links: SectionLink[];
  currentPath: string;
  locale: Locale;
  children?: ReactNode;
}

function BrandLogo({ altText }: { altText?: string }) {
  const artwork = brand.logo.logotype;
  const alt = altText ?? artwork.altText ?? `${brand.meta.name} logotype`;

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

export default function SideNav({ links, currentPath, locale, children }: Props) {
  const localizedBrand = resolveBrand(brand, locale);
  const ui = getUi(locale);

  return (
    <SidebarProvider className="min-w-0" defaultOpen>
      <Sidebar
        side={getDirection(locale) === "rtl" ? "right" : "left"}
        locale={locale}
        className="h-full"
      >
        <SidebarHeader>
          <div className="flex items-center justify-between ps-2 pt-2">
            <a
              className=""
              href={`/${locale}/`}
              aria-label={`${localizedBrand.meta.name} ${localizedBrand.meta.documentTitle}`}
            >
              <BrandLogo altText={localizedBrand.logo.logotype.altText} />
            </a>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-(length:--text-body) font-medium">
              {ui.nav.sections}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label={ui.nav.sections}>
                <SidebarMenu>
                  {links.map((link) => {
                    const isActive = currentPath === link.href;

                    return (
                      <SidebarMenuItem key={link.id}>
                        <SidebarMenuButton
                          className="text-muted-foreground data-active:text-foreground hover:text-accent text-sm tracking-[-0.01em] no-underline hover:bg-transparent active:bg-transparent data-active:bg-transparent data-active:font-medium"
                          isActive={isActive}
                          render={
                            <a href={link.href} aria-current={isActive ? "page" : undefined} />
                          }
                        >
                          {brand.navigation.numbering && (
                            <span
                              className={`tnum font-normal text-[color-mix(in_srgb,currentColor_40%,transparent)]`}
                            >
                              {link.number}
                            </span>
                          )}
                          <span>{link.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-[var(--space-m)] p-[var(--space-m)]">
          <ThemeToggle defaultTheme={brand.theme.default} locale={locale} />
          <nav
            className="flex items-center gap-2 text-[length:var(--text-caption)]"
            aria-label={ui.languageSwitcher.label}
          >
            {supportedLocales.map((candidate, index) => (
              <Fragment key={candidate}>
                {index > 0 && <span aria-hidden="true">/</span>}
                <a
                  href={getLocalizedPath(currentPath, candidate)}
                  aria-current={candidate === locale ? "page" : undefined}
                >
                  {localeInfo[candidate].label}
                </a>
              </Fragment>
            ))}
          </nav>
          <p className="text-[length:var(--text-caption)] leading-[var(--text-caption--line-height)] tracking-[var(--text-caption--letter-spacing)] text-[var(--muted-foreground)]">
            {localizedBrand.meta.name} © {localizedBrand.meta.year}
            <br />
            {ui.brand.version} {localizedBrand.meta.version}
          </p>
        </SidebarFooter>
      </Sidebar>

      <div className="relative min-w-0 flex-1" data-page-shell>
        <SidebarTrigger
          locale={locale}
          className="text-primary-foreground hover:bg-primary-foreground hover:text-primary border-primary-foreground absolute inset-s-(--page-gutter) top-(--space-m) z-30 rounded-full"
          variant="outline"
          size="icon"
        />
        {children}
      </div>
    </SidebarProvider>
  );
}
