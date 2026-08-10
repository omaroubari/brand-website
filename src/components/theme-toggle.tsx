"use client";

import { useTheme } from "@/hooks/use-theme";
import type { ThemeSetting } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Theme control driven by the shared theme state (@/lib/theme via useTheme).
 * The icon reflects the next useful action: moon switches to dark, monitor
 * returns to the system preference, and sun switches to light.
 */
export function ThemeToggle({
  className,
  defaultTheme = "system",
  onClick,
  size = "icon",
  variant = "link",
  ...props
}: React.ComponentProps<typeof Button> & { defaultTheme?: ThemeSetting }) {
  const { isDark, systemTheme, setTheme } = useTheme({ defaultTheme });

  const mode =
    isDark === (systemTheme === "dark")
      ? isDark
        ? "light"
        : "dark"
      : "system";
  const actionLabel = `Switch to ${mode} mode`;

  return (
    <Button
      type="button"
      data-theme-mode={mode}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={(e) => {
        onClick?.(e);
        setTheme(mode);
      }}
      size={size}
      variant={variant}
      className={cn("", className)}
      // className="hover:text-primary relative flex cursor-pointer items-center justify-center p-2 transition-[stroke]">
      {...props}>
      {mode === "system" ? (
        <svg
          id="monitor"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256">
          <rect width="256" height="256" fill="none" />
          <rect
            x="32"
            y="48"
            width="192"
            height="144"
            rx="16"
            transform="translate(256 240) rotate(180)"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <line
            x1="160"
            y1="224"
            x2="96"
            y2="224"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
        </svg>
      ) : mode === "light" ? (
        <svg id="sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
          <rect width="256" height="256" fill="none" />
          <line
            x1="128"
            y1="40"
            x2="128"
            y2="16"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <circle
            cx="128"
            cy="128"
            r="56"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <line
            x1="64"
            y1="64"
            x2="48"
            y2="48"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <line
            x1="64"
            y1="192"
            x2="48"
            y2="208"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <line
            x1="192"
            y1="64"
            x2="208"
            y2="48"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <line
            x1="192"
            y1="192"
            x2="208"
            y2="208"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <line
            x1="40"
            y1="128"
            x2="16"
            y2="128"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <line
            x1="128"
            y1="216"
            x2="128"
            y2="240"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
          <line
            x1="216"
            y1="128"
            x2="240"
            y2="128"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
        </svg>
      ) : (
        <svg id="moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
          <rect width="256" height="256" fill="none" />
          <path
            d="M108.11,28.11A96.09,96.09,0,0,0,227.89,147.89,96,96,0,1,1,108.11,28.11Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
          />
        </svg>
      )}
    </Button>
  );
}

export default ThemeToggle;
