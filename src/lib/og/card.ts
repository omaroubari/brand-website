import { imageSize } from "image-size";
import { render } from "takumi-js";
import { container, image, text } from "takumi-js/helpers";
import type { Node } from "takumi-js/helpers";

import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "./dimensions";

export interface OgLocalFont {
  name: string;
  src: string;
  weight?: number;
  style?: "normal" | "italic";
}

export interface OgCardOptions {
  title: string;
  siteTitle: string;
  eyebrow?: string;
  description?: string;
  logo?: string | false;
  site?: string;
  fonts?: OgLocalFont[];
  fontData?: Record<string, string>;
  titleFont?: string;
  bodyFont?: string;
  palette: {
    accent: string;
    background: string;
    border: string;
    foreground: string;
    muted: string;
  };
  dir: "ltr" | "rtl";
}

export const truncate = (value: string, max: number): string => {
  const chars = [...value];
  return chars.length > max
    ? `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`
    : value;
};

const titleSize = (title: string): number => {
  if ([...title].length > 60) return 52;
  if ([...title].length > 40) return 64;
  return 76;
};

const fontFamily = (family?: string): { fontFamily?: string } =>
  family ? { fontFamily: family } : {};

const logoMark = (svg: string, foreground: string): Node => {
  const painted = svg.replaceAll("currentColor", foreground);
  let aspect = 1;
  try {
    const { height, width } = imageSize(Buffer.from(painted));
    if (width && height) aspect = width / height;
  } catch {
    // A dimensionless SVG remains a square rather than breaking the build.
  }
  const width = Math.min(240, 32 * aspect);
  const height = width / aspect;
  return image({
    width: Math.round(width),
    height: Math.round(height),
    src: `data:image/svg+xml;base64,${Buffer.from(painted).toString("base64")}`,
  });
};

const initialMark = (accent: string, initial: string): Node =>
  container({
    children: [
      text(initial, { color: "#ffffff", fontSize: 32, fontWeight: 600 }),
    ],
    style: {
      alignItems: "center",
      backgroundColor: accent,
      borderRadius: 140,
      display: "flex",
      height: 60,
      justifyContent: "center",
      width: 60,
    },
  });

export async function renderOgImage(
  options: OgCardOptions,
): Promise<Uint8Array> {
  const titleFamily = fontFamily(options.titleFont);
  const bodyFamily = fontFamily(options.bodyFont);
  const initial = [...options.siteTitle.trim()][0]?.toUpperCase() ?? "";
  const loadedFonts = (options.fonts ?? []).map((font) => ({
    data: () => Uint8Array.fromBase64(options.fontData?.[font.src] ?? ""),
    key: font.src,
    name: font.name,
    weight: font.weight,
    style: font.style,
  }));

  const mark =
    options.logo === false
      ? []
      : [
          options.logo
            ? logoMark(options.logo, options.palette.foreground)
            : initialMark(options.palette.accent, initial),
        ];

  const card = container({
    dir: options.dir,
    children: [
      ...mark,
      container({
        children: [
          options.eyebrow
            ? text(options.eyebrow, {
                color: options.palette.foreground,
                fontSize: 24,
                fontWeight: 500,
                ...bodyFamily,
              })
            : container({}),
          text(truncate(options.title, 64), {
            color: options.palette.foreground,
            fontSize: titleSize(options.title),
            fontWeight: 600,
            letterSpacing: "-0.05em",
            lineHeight: 1.05,
            marginTop: 24,
            maxWidth: 1010,
            textWrap: "balance",
            ...titleFamily,
          }),
          options.description
            ? text(truncate(options.description, 140), {
                color: options.palette.muted,
                fontSize: 30,
                lineHeight: 1.4,
                fontWeight: 500,
                marginTop: 30,
                maxWidth: 900,
                textAlign: "start",
                textWrap: options.dir === "rtl" ? "wrap" : "balance",
                ...bodyFamily,
              })
            : container({}),
        ],
        style: {
          display: "flex",
          flexDirection: "column",
        },
      }),
      options.site
        ? container({
            children: [
              container({
                style: {
                  backgroundColor: options.palette.border,
                  height: 1,
                  width: "100%",
                },
              }),
              text(options.site, {
                color: options.palette.muted,
                fontSize: 22,
                marginTop: 28,
                ...bodyFamily,
              }),
            ],
            style: {
              display: "flex",
              flexDirection: "column",
              width: "100%",
            },
          })
        : container({}),
    ],
    style: {
      backgroundColor: options.palette.background,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      justifyContent: "space-between",
      padding: "64px 72px 52px",
      width: "100%",
    },
  });

  return render(card, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    fonts: loadedFonts,
  });
}
