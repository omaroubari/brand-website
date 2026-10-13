import { Renderer } from "takumi-js/node";
import type { ResolvedConfig } from "../core/schema.ts";
import type { OgRenderFont } from "./card.ts";
import { defaultFont } from "../brand/fonts.ts";

/** The public astro:assets fontData shape, including distinct coverage subsets.
 *
 *  An object where each key is a cssVariable and the value is an array describing
 *  the associated fonts. Each font is an object containing an array of src available
 *  for that font and the following optional properties: weight and style.
 *
 */
export type AstroFontData = Record<
  string,
  {
    src: { url: string; format?: string }[];
    weight?: string;
    style?: string;
    subset?: string;
  }[]
>;

/** Read Astro's resolved files, sharing its provider selection and download cache. */
export async function loadOgFonts(
  fontConfig: ResolvedConfig["fonts"],
  resolved: AstroFontData,
  resolveURL: (url: string) => string,
  bundled?: Record<string, string>,
  warn: (message: string) => void = console.warn,
): Promise<{
  fonts: OgRenderFont[];
  renderer: Renderer;
}> {
  const fontData: Record<string, string> = {};
  const fonts: OgRenderFont[] = [];
  // Validate each face in isolation so one corrupt file cannot break all cards.
  const validator = new Renderer();
  for (const declaration of fontConfig) {
    const faces = resolved[declaration.cssVariable] ?? [];
    if (!faces.length)
      warn(
        `OG font "${declaration.name}" is unavailable. Using Takumi fallback.`,
      );
    for (const [index, face] of faces.entries()) {
      let loaded = false;
      for (const source of face.src) {
        try {
          const response = await fetch(resolveURL(source.url));
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const bytes = new Uint8Array(await response.arrayBuffer());
          const name = `${declaration.cssVariable}:${index}`;
          const weight =
            face.weight && /^\d+$/u.test(face.weight)
              ? Number(face.weight)
              : undefined;

          const font = {
            name,
            subsetOf: declaration.name,
            src: source.url,
            weight,
            style: face.style,
            data: bytes,
          };

          const registered = await validator.registerFont({
            ...font,
            data: bytes,
          });

          if (!registered.length) throw new Error("No usable font faces");
          fontData[source.url] = Buffer.from(bytes).toString("base64");
          fonts.push(font);
          loaded = true;
          break;
        } catch {
          // Sources within a face are alternatives; try the next format.
        }
      }
      if (!loaded)
        warn(
          `Cannot load OG font "${declaration.name}" (${face.subset ?? "face"}).`,
        );
    }
  }
  return { fonts, renderer: validator };
}

/** Split a CSS family/var list without splitting nested fallbacks or quoted names. */
function splitStack(value: string): string[] {
  let depth = 0;
  let quote = "";
  let start = 0;
  const result: string[] = [];
  for (let index = 0; index < value.length; index++) {
    const char = value[index]!;
    if (quote) {
      if (char === quote && value[index - 1] !== "\\") quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  return [...result, value.slice(start).trim()];
}

export function resolveOgFontFamily(
  stack: string,
  declarations: ResolvedConfig["fonts"],
  fonts: OgRenderFont[],
): string {
  const available = new Set(fonts.map((font) => font.subsetOf ?? font.name));

  const resolve = (value: string): string[] =>
    splitStack(value).flatMap((part): string[] => {
      if (part.startsWith("var(") && part.endsWith(")")) {
        const [variable, ...fallback] = splitStack(part.slice(4, -1));
        const declaration = declarations.find(
          (font) => font.cssVariable === variable,
        );
        return declaration && available.has(declaration.name)
          ? [declaration.name]
          : resolve(fallback.join(","));
      }
      const name = part.replace(/^(["'])(.*)\1$/u, "$2");
      return available.has(name) ? [name] : [];
    });

  const families = resolve(stack);

  // Add fallback font at the end of the font list if it has been declared and loaded
  if (
    declarations.some((font) => font.cssVariable === defaultFont.cssVariable) &&
    available.has(defaultFont.name)
  ) {
    families.push(defaultFont.name);
  }

  const fontFamily = [...new Set(families)]
    .map((name) => JSON.stringify(name))
    .join(", ");

  return fontFamily;
}
