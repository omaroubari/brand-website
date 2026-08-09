"use client"

import type { ReactNode } from "react"

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
} from "@/components/ui/sidebar"
import ThemeToggle from "@/components/theme-toggle"
import { brand } from "../../brand/config"
import type { SectionLink } from "../../lib/sections"

interface Props {
  links: SectionLink[]
  currentPath: string
  children?: ReactNode
}

function BrandLogo() {
  const artwork = brand.logo.logotype
  const alt = artwork.altText ?? `${brand.meta.name} logotype`

  return (
    <span
      className=""
    >
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
  )
}

export default function SideNav({ links, currentPath, children }: Props) {
  return (
    <SidebarProvider
      className="min-w-0"
      defaultOpen
    >
      <Sidebar className="">
        <SidebarHeader>
          <div className="flex items-center p-2 justify-between">
            <a
              className=""
              href="/"
              aria-label={`${brand.meta.name} ${brand.meta.documentTitle}`}
            >
              <BrandLogo />
              {/*<span className="text-[0.6875rem] font-medium uppercase tracking-[0.09em] text-muted">
                {brand.meta.documentTitle}
              </span>*/}
            </a>
            <SidebarTrigger className="m-0" />
          </div>
        </SidebarHeader>

        <SidebarSeparator className="mx-0"/>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Contents</SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label="Sections">
                <SidebarMenu>
                  {links.map((link) => {
                    const isActive = currentPath === link.href

                    return (
                      <SidebarMenuItem key={link.id}>
                        <SidebarMenuButton
                          className={` text-sm font-light tracking-[-0.01em] no-underline ${isActive ? "!text-[var(--ink)]" : ""}`}
                          isActive={isActive}
                          render={
                            <a
                              href={link.href}
                              aria-current={isActive ? "page" : undefined}
                            />
                          }
                        >
                          {brand.numbering && (
                            <span
                              className={`tnum [font-family:var(--font-text)] text-[0.6875rem] tracking-[0.06em] text-[color-mix(in_srgb,currentColor_65%,transparent)] ${isActive ? "text-accent" : ""}`}
                            >
                              {link.number}
                            </span>
                          )}
                          <span>{link.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-[var(--space-m)] p-[var(--space-m)]">
          <ThemeToggle />
          <p className="text-[0.6875rem] leading-[1.5] tracking-[var(--type-caption-tracking)] text-[var(--muted)]">
            {brand.meta.name} © {brand.meta.year}
            <br />
            Version {brand.meta.version}
          </p>
        </SidebarFooter>
      </Sidebar>

      {children}

      <div className="fixed top-[var(--space-m)] right-[var(--page-gutter)] z-30 hidden items-center gap-[var(--space-xs)] rounded-full border border-[var(--line)] bg-[var(--surface)] py-[0.25rem] pr-[0.55rem] pl-[0.25rem] text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-[var(--ink)] max-[47.999rem]:inline-flex">
        <SidebarTrigger className="m-0 text-[var(--muted)]" />
        <span>Contents</span>
      </div>
    </SidebarProvider>
  )
}
