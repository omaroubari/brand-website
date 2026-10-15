import { icons as phosphorIcons } from "@iconify-json/ph";
import { getIconData } from "@iconify/utils/lib/icon-set/get-icon";
import { iconToSVG } from "@iconify/utils/lib/svg/build";

/** Icon metadata is a string, resolved against the bundled Iconify set. */
export type ContentIconName = string;

export interface ContentIconSvg {
  body: string;
  viewBox: string;
}

/** Bare names and the bundled set's explicit prefix resolve identically. */
function normalizeContentIconName(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith(`${phosphorIcons.prefix}:`)
    ? normalized.slice(phosphorIcons.prefix.length + 1)
    : normalized;
}

function resolveIconData(name: string) {
  const normalized = normalizeContentIconName(name);
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(normalized) ||
    (!Object.hasOwn(phosphorIcons.icons, normalized) &&
      !Object.hasOwn(phosphorIcons.aliases ?? {}, normalized))
  )
    return null;
  return getIconData(phosphorIcons, normalized);
}

export function resolveIcon(name: string): ContentIconSvg | undefined {
  const data = resolveIconData(name);
  if (!data) return undefined;
  const svg = iconToSVG(data);
  return { body: svg.body, viewBox: svg.attributes.viewBox };
}
