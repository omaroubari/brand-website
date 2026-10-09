import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// Run after sandbox:pack and updating the sandbox's file: dependency.
// All destructive probes use a disposable copy of the authored consumer.
const sandbox = fileURLToPath(
  new URL("../../../apps/sandbox/", import.meta.url),
);
const temporaryRoot = fileURLToPath(new URL("../tmp/", import.meta.url));
await mkdir(temporaryRoot, { recursive: true });
const root = await mkdtemp(join(temporaryRoot, "packed-og-"));
const execute = promisify(execFile);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (path) => readFile(join(root, path));
const png = async (route) => {
  const bytes = await read(`dist/og/${route}.png`);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16), 1200);
  assert.equal(bytes.readUInt32BE(20), 630);
  return hash(bytes);
};
const metadata = async (route) => {
  const html = (await read(`dist/${route}/index.html`)).toString();
  return [
    ...html.matchAll(
      /<meta\s+(?:property|name)="(?:og:[^"]+|twitter:[^"]+)"[^>]*>/gu,
    ),
  ]
    .map(([tag]) => tag)
    .sort();
};
const build = async () => {
  // Reuse Astro's existing provider cache; never synthesize remote font data.
  await mkdir(join(root, ".brandtree/node_modules/.astro"), {
    recursive: true,
  });
  await cp(
    join(sandbox, ".brandtree/node_modules/.astro/fonts"),
    join(root, ".brandtree/node_modules/.astro/fonts"),
    { recursive: true },
  );
  const { stdout, stderr } = await execute(
    process.execPath,
    [join(root, "node_modules/brandtree/dist/cli/index.js"), "build"],
    {
      cwd: root,
      timeout: 120000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  const output = stdout + stderr;
  assert.doesNotMatch(
    output,
    /Cannot load OG font|OG font .* is unavailable/iu,
  );
  return output;
};
try {
  const manifest = JSON.parse(
    await readFile(join(sandbox, "package.json"), "utf8"),
  );
  assert.equal(manifest.dependencies.brandtree, "file:brandtree.tgz");
  const packedFonts = await readFile(
    join(sandbox, "node_modules/brandtree/src/og/fonts.ts"),
    "utf8",
  );
  assert.equal(
    packedFonts,
    await readFile(new URL("../src/og/fonts.ts", import.meta.url), "utf8"),
    "Refresh the sandbox's packed dependency first",
  );
  for (const name of [
    "content",
    "components",
    "assets",
    "public",
    "package.json",
    "brandtree.config.ts",
  ]) {
    await cp(join(sandbox, name), join(root, name), { recursive: true });
  }
  await symlink(
    join(sandbox, "node_modules"),
    join(root, "node_modules"),
    "dir",
  );
  const configPath = join(root, "brandtree.config.ts");
  let config = await readFile(configPath, "utf8");
  assert.match(config, /^  fonts: \[/mu);
  await writeFile(configPath, config);
  await writeFile(
    join(root, "content/en/99-social-check.md"),
    "---\ntitle: Authored social page\ndescription: Consumer description\nseo:\n  title: Authored social headline\n---\nSocial card check.\n",
  );
  await writeFile(
    join(root, "content/en/98-social-override.md"),
    "---\ntitle: Explicit image\nseo:\n  image: /brand/logotype-dark.svg\n---\nExplicit override.\n",
  );
  await build();
  const baseline = await Promise.all([
    png("en"),
    png("ar"),
    png("en/logo"),
    png("ar/logo"),
    png("en/social-check"),
  ]);
  const baselineMeta = await Promise.all([
    metadata("en"),
    metadata("ar"),
    metadata("en/social-check"),
  ]);
  assert.match(baselineMeta[2].join("\n"), /Authored social headline/u);
  assert.match(baselineMeta[2].join("\n"), /og\/en\/social-check\.png/u);
  assert.match(baselineMeta[2].join("\n"), /twitter:image/u);
  assert.match(
    (await metadata("en/social-override")).join("\n"),
    /brand\/logotype-dark\.svg/u,
  );
  await assert.rejects(read("dist/og/en/social-override.png"), {
    code: "ENOENT",
  });
  const english = (await read("dist/en/index.html")).toString();
  const arabic = (await read("dist/ar/index.html")).toString();
  assert.match(english, /--font-sandbox:/u);
  assert.match(arabic, /--font-sandbox-arabic:/u);
  assert.match(arabic, /font-family:\s*['"]?Rubik/iu);
  assert.match(arabic, /unicode-range:/iu);
  await rm(join(root, ".brandtree"), { recursive: true, force: true });
  await build();
  assert.deepEqual(
    await Promise.all([
      png("en"),
      png("ar"),
      png("en/logo"),
      png("ar/logo"),
      png("en/social-check"),
    ]),
    baseline,
  );
  assert.deepEqual(
    await Promise.all([
      metadata("en"),
      metadata("ar"),
      metadata("en/social-check"),
    ]),
    baselineMeta,
  );
  const font = join(root, "assets/fonts/Inter-Variable.woff2");
  await rename(font, `${font}.saved`);
  const recovery = await build();
  assert.match(recovery, /BRANDTREE_LOCAL_FILE_UNAVAILABLE/u);
  const data = JSON.parse(
    (await read(".brandtree/src/generated/data.json")).toString(),
  );
  assert(
    data.config.fonts.some(
      ({ name, provider }) => name === "Inter" && provider === "google",
    ),
  );
  await png("en/social-check");
  const recoveredConfig = (
    await read(".brandtree/astro.config.mjs")
  ).toString();
  assert.match(recoveredConfig, /--font-brandtree-default/u);
  await rename(`${font}.saved`, font);
  await build();
  assert.deepEqual(
    await Promise.all([
      png("en"),
      png("ar"),
      png("en/logo"),
      png("ar/logo"),
      png("en/social-check"),
    ]),
    baseline,
  );
  await rm(join(root, "content/en/99-social-check.md"));
  await build();
  await assert.rejects(read("dist/og/en/social-check.png"), { code: "ENOENT" });
  await writeFile(
    configPath,
    config.replace("enabled: true", "enabled: false"),
  );
  await build();
  await assert.rejects(read("dist/og/en.png"), { code: "ENOENT" });
  assert.doesNotMatch(
    (await metadata("en")).join("\n"),
    /og:image|twitter:image/u,
  );
  assert.match(
    (await metadata("en/social-override")).join("\n"),
    /brand\/logotype-dark\.svg/u,
  );
  console.log(
    "Packed OG checks passed: local/Google fonts, locale cards, authored metadata, runtime deletion, missing-font recovery/restoration, page deletion, overrides, disabled generation.",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
