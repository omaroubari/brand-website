"use client";

import type { ReactNode } from "react";

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
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/theme-toggle";
import { brand } from "../../brand/config";
import type { SectionLink } from "../../lib/sections";

interface Props {
  links: SectionLink[];
  currentPath: string;
  children?: ReactNode;
}

function BrandLogo() {
  const artwork = brand.logo.logotype;
  const alt = artwork.altText ?? `${brand.meta.name} logotype`;

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

export default function SideNav({ links, currentPath, children }: Props) {
  return (
    <SidebarProvider className="min-w-0" defaultOpen>
      <Sidebar className="h-full">
        <SidebarHeader>
          <div className="flex items-center justify-between ps-2 pt-2">
            <a
              className=""
              href="/"
              aria-label={`${brand.meta.name} ${brand.meta.documentTitle}`}>
              <BrandLogo />
            </a>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-(length:--text-body) font-medium text-muted-foreground">Contents</SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label="Sections">
                <SidebarMenu>
                  {links.map((link) => {
                    const isActive = currentPath === link.href;

                    return (
                      <SidebarMenuItem key={link.id}>
                        <SidebarMenuButton
                          className="text-sm text-muted-foreground data-active:font-medium active:bg-transparent tracking-[-0.01em] no-underline data-active:bg-transparent data-active:text-foreground hover:bg-transparent hover:text-accent"
                          isActive={isActive}
                          render={
                            <a
                              href={link.href}
                              aria-current={isActive ? "page" : undefined}
                            />
                          }>
                          {brand.numbering && (
                            <span
                              className={`tnum font-normal text-[color-mix(in_srgb,currentColor_40%,transparent)]`}>
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
          <ThemeToggle defaultTheme={brand.theme.default} />
          <p className="text-[length:var(--text-caption)] leading-[var(--text-caption--line-height)] tracking-[var(--text-caption--letter-spacing)] text-[var(--muted-foreground)]">
            {brand.meta.name} © {brand.meta.year}
            <br />
            Version {brand.meta.version}
          </p>
        </SidebarFooter>
      </Sidebar>

      <div className="relative min-w-0 flex-1" data-page-shell>
        <SidebarTrigger className="absolute top-(--space-m) text-primary-foreground hover:bg-primary-foreground hover:text-primary border-primary-foreground inset-s-(--page-gutter) rounded-full z-30" variant="outline" size="icon" />
        {children}
      </div>
    </SidebarProvider>
  );
}
