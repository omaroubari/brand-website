import { defineConfig } from "brandtree";

// Valence data adapted from apps/web; complete required brand schema.
// Local Inter and Google Rubik exercise canonical and locale font loading.
export default defineConfig({
  fonts: [
    {
      name: "Inter",
      cssVariable: "--font-sandbox",
      provider: "local",
      weights: ["100 900"],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [
          {
            src: ["./assets/fonts/Inter-Variable.woff2"],
            weight: "100 900",
            style: "normal",
          },
        ],
      },
    },
    {
      name: "Rubik",
      cssVariable: "--font-sandbox-arabic",
      provider: "google",
      weights: ["300 900"],
      styles: ["normal"],
      subsets: ["arabic", "latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
  brand: {
    meta: {
      name: "Valence",
      legalName: "Studio Valence Design",
      tagline: "Web Design Studio",
      documentTitle: "Brand Guidelines",
      version: "1.1",
      year: 2026,
      url: "https://brand.byvalence.com",
      description:
        "The brand guidelines for Studio Valence — logo usage, colour, typography and application rules.",
    },
    colors: {
      palette: [
        {
          id: "neutral",
          name: "Neutral",
          shades: {
            "50": {
              space: "hex",
              value: "#fafafa",
            },
            "100": {
              space: "hex",
              value: "#f4f4f5",
            },
            "200": {
              space: "hex",
              value: "#e4e4e7",
            },
            "300": {
              space: "hex",
              value: "#d4d4d8",
            },
            "400": {
              space: "hex",
              value: "#a1a1aa",
            },
            "500": {
              space: "hex",
              value: "#71717a",
            },
            "600": {
              space: "hex",
              value: "#52525b",
            },
            "700": {
              space: "hex",
              value: "#3f3f46",
            },
            "800": {
              space: "hex",
              value: "#27272a",
            },
            "900": {
              space: "hex",
              value: "#18181b",
            },
            "950": {
              space: "hex",
              value: "#09090b",
            },
          },
        },
        {
          id: "orange",
          name: "Orange",
          shades: {
            "50": {
              space: "hex",
              value: "#fff3ed",
            },
            "100": {
              space: "hex",
              value: "#ffe2d5",
            },
            "200": {
              space: "hex",
              value: "#ffc2a8",
            },
            "300": {
              space: "hex",
              value: "#ff976e",
            },
            "400": {
              space: "hex",
              value: "#ff6235",
            },
            "500": {
              space: "hex",
              value: "#ef3800",
            },
            "600": {
              space: "hex",
              value: "#ca2f00",
            },
            "700": {
              space: "hex",
              value: "#a62700",
            },
            "800": {
              space: "hex",
              value: "#852200",
            },
            "900": {
              space: "hex",
              value: "#6e2100",
            },
            "950": {
              space: "hex",
              value: "#3b1000",
            },
          },
        },
      ],
      swatches: [
        {
          id: "black",
          name: "Black",
          color: "neutral-950",
          cmyk: [18, 18, 0, 96],
          usage: "Primary type, backgrounds, the logotype on light surfaces.",
          category: "primary",
        },
        {
          id: "white",
          name: "White",
          color: "white",
          cmyk: [0, 0, 0, 0],
          usage: "Primary surface. The logotype reverses to white on dark.",
          category: "primary",
        },
        {
          id: "orange-red",
          name: "Orange",
          color: "orange-500",
          cmyk: [0, 77, 100, 6],
          usage:
            "One accent, used sparingly: calls to action, headers, highlights.",
          category: "secondary",
          on: "white",
        },
      ],
    },
    theme: {
      default: "system",
      light: {
        background: "white",
        foreground: "black",
        card: "white",
        cardForeground: "black",
        popover: "white",
        popoverForeground: "black",
        primary: "orange-500",
        primaryForeground: "white",
        secondary: "neutral-200",
        secondaryForeground: "black",
        muted: "neutral-200",
        mutedForeground: "neutral-600",
        accent: "orange-500",
        accentForeground: "white",
        destructive: "orange-500",
        destructiveForeground: "white",
        border: "neutral-200",
        input: "neutral-200",
        ring: "orange-500",
        chart1: "orange-500",
        chart2: "neutral-600",
        chart3: "neutral-400",
        chart4: "black",
        chart5: "white",
        sidebar: "white",
        sidebarForeground: "black",
        sidebarPrimary: "orange-500",
        sidebarPrimaryForeground: "white",
        sidebarAccent: "neutral-200",
        sidebarAccentForeground: "black",
        sidebarBorder: "neutral-200",
        sidebarRing: "orange-500",
      },
      dark: {
        background: "black",
        foreground: "white",
        card: "neutral-800",
        cardForeground: "white",
        popover: "black",
        popoverForeground: "white",
        primary: "orange-500",
        primaryForeground: "white",
        secondary: "neutral-800",
        secondaryForeground: "white",
        muted: "neutral-800",
        mutedForeground: "neutral-200",
        accent: "orange-500",
        accentForeground: "white",
        destructive: "orange-500",
        destructiveForeground: "white",
        border: "neutral-800",
        input: "neutral-800",
        ring: "orange-500",
        chart1: "orange-500",
        chart2: "neutral-200",
        chart3: "neutral-600",
        chart4: "white",
        chart5: "black",
        sidebar: "black",
        sidebarForeground: "white",
        sidebarPrimary: "orange-500",
        sidebarPrimaryForeground: "white",
        sidebarAccent: "orange-500",
        sidebarAccentForeground: "white",
        sidebarBorder: "neutral-800",
        sidebarRing: "orange-500",
      },
    },
    typography: {
      display: "var(--font-sandbox)",
      text: "var(--font-sandbox)",
      mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
      families: [
        {
          id: "display",
          name: "Inter",
        },
        {
          id: "text",
          name: "Inter",
        },
      ],
      weights: [
        {
          name: "Light",
          weight: 300,
        },
        {
          name: "Regular",
          weight: 400,
        },
        {
          name: "Medium",
          weight: 500,
        },
        {
          name: "Semibold",
          weight: 600,
        },
        {
          name: "Bold",
          weight: 700,
        },
        {
          name: "Heavy",
          weight: 800,
        },
      ],
      scale: [
        {
          name: "Display+",
          id: "display-plus",
          role: "The largest expressive style. Use for covers and hero moments.",
          font: "display",
          weight: 600,
          size: "clamp(3rem, 8vw, 5rem)",
          lineHeight: "1",
          tracking: "-0.04em",
          sample: "Progress",
        },
      ],
    },
    logo: {
      logotype: {
        onLight: "/brand/logotype-dark.svg",
        onDark: "/brand/logotype-light.svg",
        aspect: 4.615384615384615,
      },
      brandmark: {
        onLight: "/brand/brandmark-dark.svg",
        onDark: "/brand/brandmark-light.svg",
        aspect: 1,
      },
      favicon: "/favicon.svg",
      pronunciation: "VAY • luhns",
      clearspace: {
        unit: "the height of the lowercase “e”",
        ratio: 0.34,
      },
      minSize: {
        digital: "96 px wide",
        print: "20 mm wide",
      },
      colorways: [
        {
          id: "primary",
          fg: "white",
          bg: "black",
          label: "Primary",
        },
        {
          id: "primary-reversed",
          fg: "black",
          bg: "white",
          label: "Primary reversed",
        },
        {
          id: "accent",
          fg: "white",
          bg: "orange-500",
        },
      ],
    },
    contact: {
      email: "omar@byvalence.com",
      website: "www.byvalence.com",
      socials: [],
    },
    localeOverrides: {
      ar: {
        meta: {
          tagline: "استوديو تصميم الويب",
          documentTitle: "دليل الهوية",
          description:
            "دليل الهوية لاستوديو فالنس — استخدام الشعار والألوان والطباعة وقواعد التطبيق.",
        },
        logo: {
          pronunciation: "فاي • لَنس",
          clearspace: {
            unit: "ارتفاع الحرف الصغير «e»",
          },
          colorways: [
            {
              id: "primary",
              label: "أساسي",
            },
            {
              id: "primary-reversed",
              label: "الأساسي المعكوس",
            },
            {
              id: "accent",
              label: "إبراز",
            },
          ],
        },
        typography: {
          display: "var(--font-sandbox-arabic)",
          text: "var(--font-sandbox-arabic)",
          families: [
            {
              id: "display",
              name: "PP Neue Montreal Arabic",
            },
            {
              id: "text",
              name: "PP Neue Montreal Arabic",
            },
          ],
          scale: [
            {
              id: "display-plus",
              role: "النمط التعبيري الأكبر، ويُستخدم للأغلفة واللحظات الرئيسية.",
              sample: "تقدّم",
            },
          ],
        },
      },
    },
  },
  navigation: {
    numbering: true,
  },
  i18n: {
    defaultLocale: "en",
    locales: [
      {
        code: "en",
        label: "English",
        dir: "ltr",
      },
      {
        code: "ar",
        label: "العربية",
        dir: "rtl",
      },
    ],
    hideDefaultLocalePrefix: false,
    parser: "dir",
  },
  seo: {
    og: {
      enabled: false,
    },
  },
});
