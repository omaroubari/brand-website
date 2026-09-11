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
import config, { brand } from "../../brand/config";
import { contentIcons } from "../../lib/core/icons";

import {
  getLocalizedPath,
  getUi,
  localeInfo,
  supportedLocales,
  getDirection,
  resolveBrand,
} from "../../i18n";

import type { NavNode } from "@/lib/types";

interface Props {
  items: NavNode[];
  currentRoute: string;
  locale: string;
  navigationRoot: string;
  children?: ReactNode;
}

function NavIcon({ name }: { name?: string }) {
  if (!name) return null;
  const Icon = contentIcons[name as keyof typeof contentIcons];
  return Icon ? <Icon aria-hidden="true" focusable="false" size={16} /> : null;
}

function normalizedPath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

function NavTree({
  items,
  currentRoute,
  depth = 0,
  idPrefix = "n",
  root = depth === 0,
}: {
  items: NavNode[];
  currentRoute: string;
  depth?: number;
  /** Hierarchical ID prefix for navigation items (`${prefix}.${index}`). */
  idPrefix?: string;
  /** Identifies the top-level menu for styling and numbering. */
  root?: boolean;
}) {
  return (
    <SidebarMenu
      className={
        !root ? "border-sidebar-border ms-[17px] border-s-1 ps-[9px]" : ""
      }
      data-nav-depth={depth}
      data-nav-root={root}>
      {items.map((item, index) => {
        const id = `${idPrefix}.${index}`;
        const href = item.route;
        const title = item.label;
        const isActive = Boolean(
          href && normalizedPath(currentRoute) === normalizedPath(href),
        );
        const number = root ? String(index + 1).padStart(2, "0") : undefined;

        if (item.kind === "group") {
          return (
            <SidebarMenuItem
              key={item.path ?? item.route ?? id}
              data-nav-id={id}
              data-nav-kind="group">
              {href ? (
                <SidebarMenuButton
                  className="nav-sidebar__button text-muted-foreground data-active:text-foreground hover:text-accent bg-transparent hover:bg-transparent active:bg-transparent data-active:bg-transparent"
                  isActive={isActive}
                  render={
                    <a
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                    />
                  }>
                  <NavIcon name={item.icon} />
                  {number && config.navigation.numbering && (
                    <span className="tnum nav-sidebar__number">{number}</span>
                  )}
                  <span className="nav-sidebar__title">{title}</span>
                </SidebarMenuButton>
              ) : (
                <div className="nav-sidebar__label text-muted-foreground">
                  <NavIcon name={item.icon} />
                  {number && config.navigation.numbering && (
                    <span className="tnum nav-sidebar__number">{number}</span>
                  )}
                  <span className="nav-sidebar__title">{title}</span>
                </div>
              )}
              {item.children.length > 0 && (
                <NavTree
                  items={item.children}
                  currentRoute={currentRoute}
                  depth={depth + 1}
                  idPrefix={id}
                  root={false}
                />
              )}
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem
            key={item.pageId}
            data-nav-id={id}
            data-nav-kind="page">
            <SidebarMenuButton
              className="nav-sidebar__button text-muted-foreground data-active:text-foreground hover:text-accent bg-transparent hover:bg-transparent active:bg-transparent data-active:bg-transparent data-active:font-medium"
              isActive={isActive}
              render={
                <a
                  href={item.route}
                  aria-current={isActive ? "page" : undefined}
                />
              }>
              <NavIcon name={item.icon} />
              {number && config.navigation.numbering && (
                <span className="tnum nav-sidebar__number">{number}</span>
              )}
              <span className="nav-sidebar__title">{title}</span>
              {item.badge && (
                <span className="nav-sidebar__badge">{item.badge}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
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

export default function SideNav({
  items,
  currentRoute,
  locale,
  navigationRoot,
  children,
}: Props) {
  const localizedBrand = resolveBrand(brand, locale);
  const ui = getUi(locale);

  return (
    <SidebarProvider className="min-w-0" defaultOpen>
      <Sidebar
        side={getDirection(locale) === "rtl" ? "right" : "left"}
        locale={locale}
        className="h-full">
        <SidebarHeader>
          <div className="flex items-center justify-between ps-2 pt-2">
            <a
              className=""
              href={navigationRoot}
              aria-label={`${localizedBrand.meta.name} ${localizedBrand.meta.documentTitle}`}>
              <BrandLogo altText={localizedBrand.logo.logotype.altText} />
            </a>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-(length:--text-body) font-medium">
              {ui.nav.contents}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label={ui.nav.sections}>
                <NavTree
                  items={items}
                  currentRoute={currentRoute}
                  root={true}
                />
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-[var(--space-m)] p-[var(--space-m)]">
          <ThemeToggle defaultTheme={brand.theme.default} locale={locale} />
          <nav
            className="flex items-center gap-2 text-[length:var(--text-caption)]"
            aria-label={ui.languageSwitcher.label}>
            {supportedLocales.map((candidate, index) => (
              <Fragment key={candidate}>
                {index > 0 && <span aria-hidden="true">/</span>}
                <a
                  href={getLocalizedPath(currentRoute, candidate)}
                  aria-current={candidate === locale ? "page" : undefined}>
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
