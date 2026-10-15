import { icons } from "@iconify-json/ph";
import { getIconData, iconToSVG } from "@iconify/utils";
import { describe, expect, it } from "vitest";
import { resolveIcon } from "../src/core/icons.ts";
import { folderMetaSchema, pageMetaSchema } from "../src/core/schema.ts";

describe("bundled Iconify sidebar icons", () => {
  it("resolves every icon and alias using Iconify's SVG data", () => {
    for (const name of [
      ...Object.keys(icons.icons),
      ...Object.keys(icons.aliases ?? {}),
    ]) {
      const expected = iconToSVG(getIconData(icons, name)!);
      expect(resolveIcon(name), name).toEqual({
        body: expected.body,
        viewBox: expected.attributes.viewBox,
      });
    }
  });

  it("normalizes names and accepts string metadata in every icon field", () => {
    const name: string = " PH:ROCKET ";
    expect(resolveIcon(name)).toEqual(resolveIcon("rocket"));
    expect(
      pageMetaSchema.parse({ icon: name, sidebar: { icon: name } }).icon,
    ).toBe(name);
    expect(folderMetaSchema.parse({ icon: name }).icon).toBe(name);
  });

  it.each([
    "",
    " ",
    "missing-icon",
    "mdi:rocket",
    "__proto__",
    "constructor",
    "toString",
    "<svg/>",
    "layout-grid",
    "pen-tool",
    "sparkles",
    "type",
  ])("rejects unsupported input %j", (name) => {
    expect(resolveIcon(name)).toBeUndefined();
  });
});
