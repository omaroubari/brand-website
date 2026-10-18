import { afterEach, expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import type { Program } from "estree";
import { injectBrandtreeBaseProps } from "../src/astro/mdx-props";
import { registerMdxComponent, injectMdxProps } from "../src/core/mdx";

// Compile with the same MDX version owned by the Astro integration.
const require = createRequire(import.meta.resolve("@astrojs/mdx"));
const { compile } = await import(require.resolve("@mdx-js/mdx"));
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("injects all framework values by built-in identity and leaves native/unrelated elements untouched", () => {
  const component = () => {};
  registerMdxComponent(component);
  const unrelated = () => {};
  const context = { brand: {} as never, ui: {} as never, dir: "rtl" as const };
  const author = { title: "hello" };
  const result = injectMdxProps(component, author, context);
  expect(result).toEqual({
    brand: context.brand,
    ui: context.ui,
    dir: "rtl",
    title: "hello",
  });
  expect(result.ui).toBe(context.ui);
  expect(injectMdxProps("div", author, context)).toBe(author);
  expect(injectMdxProps(unrelated, author, context)).toBe(author);
  expect(injectMdxProps(component, { ui: undefined }, context)).toHaveProperty(
    "ui",
    undefined,
  );
});

async function compileFixture(source: string, inject = true) {
  const temporaryRoot = fileURLToPath(new URL("../tmp/", import.meta.url));
  await mkdir(temporaryRoot, { recursive: true });
  const root = await mkdtemp(join(temporaryRoot, "mdx-compiler-"));
  roots.push(root);
  await writeFile(
    join(root, "custom.mjs"),
    `import { registerMdxComponent } from ${JSON.stringify(new URL("../src/core/mdx.ts", import.meta.url).href)};
export default function Builtin() {};
registerMdxComponent(Builtin);`,
  );
  await writeFile(
    join(root, "unrelated.mjs"),
    `export default function Unrelated() {}; export const brandtreeProps = ["brand", "ui", "dir"];`,
  );
  await writeFile(
    join(root, "runtime.mjs"),
    `export const Fragment = Symbol(); export const jsx = (component, props) => ({component, props}); export const jsxs = jsx;`,
  );
  const runtimeUrl = pathToFileURL(join(root, "runtime.mjs")).href;
  const compiled = await compile(source, {
    jsxImportSource: "astro",
    recmaPlugins: [
      ...(inject ? [injectBrandtreeBaseProps] : []),
      () => (tree: Program) => {
        for (const node of tree.body) {
          if (node.type !== "ImportDeclaration") continue;
          if (node.source.value === "astro/jsx-runtime")
            node.source.value = runtimeUrl;
          if (String(node.source.value).endsWith("/src/core/mdx.ts"))
            node.source.value = new URL("../src/core/mdx.ts", import.meta.url).href;
        }
      },
    ],
  });
  const output = join(root, "compiled.mjs");
  await writeFile(output, String(compiled));
  return {
    module: await import(/* @vite-ignore */ pathToFileURL(output).href),
    source: String(compiled),
  };
}

it("injects registered built-ins through aliases and preserves nesting, overrides and spreads", async () => {
  const { module, source } = await compileFixture(`
import Summary from './custom.mjs';
import ColorPalette from './unrelated.mjs';

<div><Summary heading="Our identity" /><ColorPalette /><span /></div>

<Summary dir="ltr" {...{dir: 'rtl'}} />

<Summary {...{dir: 'rtl'}} dir="ltr" />

<Summary brand={props.brand} />

{[1].map(props => <Summary />)}

{[(function Shadow() {})].map(Summary => <Summary />)}
`);
  const context = {
    brand: { name: "Arabic brand" },
    ui: { name: "Arabic UI" },
    dir: "rtl",
  };
  const output = module.default(context);
  const children = output.props.children.filter(
    (child: unknown) => typeof child !== "string",
  );
  const nested = children[0].props.children;
  expect(nested[0].props).toEqual({
    brand: context.brand,
    ui: context.ui,
    dir: "rtl",
    heading: "Our identity",
  });
  expect(nested[0].props.brand).toBe(context.brand);
  expect(nested[1].props).toEqual({});
  expect(nested[2].props).toEqual({});
  expect(children[1].props.dir).toBe("rtl");
  expect(children[2].props.dir).toBe("ltr");
  expect(children[3].props.brand).toBe(context.brand);
  expect(children[4][0].props.brand).toBe(context.brand);
  expect(children[5][0].props).toEqual({});
  expect(source).toContain("_contentProps");
  const second = module.default({
    brand: { name: "English brand" },
    dir: "ltr",
  });
  expect(second.props.children[0].props.children[0].props.brand.name).toBe(
    "English brand",
  );
  expect(nested[0].props.brand).toBe(context.brand);
});

it("handles compiler-helper name collisions and empty documents", async () => {
  const { module } = await compileFixture(`
import Summary from './custom.mjs';

export const _injectMdxProps = 1;
export const _contentProps = 2;
export const _brandtreeModule = 3;

<Summary />
`);
  expect(module.default({ dir: "rtl" }).props.dir).toBe("rtl");
  expect((await compileFixture("")).module.default({})).toBeDefined();
});

it("preserves MDX's evaluation count for unrelated member component getters", async () => {
  const source = `
export let reads = 0;
export const catalog = { get Item() { reads++; return function Item() {}; } };

<catalog.Item />
`;
  const baseline = (await compileFixture(source, false)).module;
  const injected = (await compileFixture(source)).module;
  baseline.default({});
  injected.default({});
  expect(injected.reads).toBe(baseline.reads);
});
