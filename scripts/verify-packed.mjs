import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const frameworkRequire = createRequire(
  new URL("../packages/brandtree/package.json", import.meta.url),
);
const { createJiti } = await import(frameworkRequire.resolve("jiti"));
const { parse, stringify } = await import(frameworkRequire.resolve("yaml"));

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "brandtree-packed-"));
const fixture = join(temporary, "consumer");
let server;
try {
  const tarball = join(temporary, "brandtree.tgz");
  await run("pnpm", ["--filter", "brandtree", "pack", "--out", tarball], {
    cwd: root,
  });
  await cp(join(root, "apps/sandbox"), fixture, {
    recursive: true,
    filter: (path) =>
      !/[\\/](?:node_modules|\.brandtree|\.astro|dist)(?:[\\/]|$)/u.test(path),
  });
  const config = await createJiti(import.meta.url).import(
    join(root, "apps/sandbox/brandtree.config.ts"),
    { default: true },
  );
  // Keep this package test deterministic and independent of Google availability.
  config.fonts = config.fonts.filter((font) => font.provider === "local");
  await writeFile(
    join(fixture, "brandtree.config.ts"),
    `export default ${JSON.stringify(config)};\n`,
  );
  await cp(tarball, join(fixture, "brandtree.tgz"));
  const manifest = JSON.parse(
    await readFile(join(fixture, "package.json"), "utf8"),
  );
  await writeFile(
    join(fixture, "package.json"),
    JSON.stringify(manifest, null, 2),
  );
  // Retain the sandbox's exact isolated dependency graph, rather than updating
  // transitive dependencies as a side effect of testing package consumption.
  const lock = parse(
    (await readFile(join(root, "pnpm-lock.yaml"), "utf8")).replaceAll(
      "file:apps/sandbox/brandtree.tgz",
      "file:brandtree.tgz",
    ),
  );
  lock.importers = { ".": lock.importers["apps/sandbox"] };
  lock.packages["brandtree@file:brandtree.tgz"].resolution.integrity =
    `sha512-${createHash("sha512")
      .update(await readFile(tarball))
      .digest("base64")}`;
  await writeFile(join(fixture, "pnpm-lock.yaml"), stringify(lock));
  await run(
    "pnpm",
    [
      "install",
      "--frozen-lockfile",
      ...(process.env.BRANDTREE_PACKED_OFFLINE === "1" ? ["--offline"] : []),
    ],
    { cwd: fixture, maxBuffer: 4 * 1024 * 1024, timeout: 120_000 },
  );
  const cli = join(fixture, "node_modules/brandtree/dist/cli/index.js");
  for (const command of ["check", "build"]) {
    const { stdout, stderr } = await run(process.execPath, [cli, command], {
      cwd: fixture,
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
    });
    process.stdout.write(stdout);
    process.stderr.write(stderr);
  }
  await rm(join(fixture, ".brandtree"), { recursive: true, force: true });
  await writeFile(
    join(fixture, "brandtree.config.ts"),
    "invalid config must not affect preview",
  );
  server = spawn(
    process.execPath,
    [cli, "preview", "--host", "127.0.0.1", "--port", "0"],
    { cwd: fixture, stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  server.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk;
  });
  const deadline = Date.now() + 15_000;
  let url;
  while (Date.now() < deadline) {
    url = logs.match(/http:\/\/127\.0\.0\.1:\d+/u)?.[0];
    if (url) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!url) throw new Error(`Preview failed to start: ${logs}`);
  const response = await fetch(`${url}/en/exhibits`);
  if (!response.ok || !(await response.text()).includes("Exhibits"))
    throw new Error("Packed preview did not serve the built exhibits");
  const exited = once(server, "exit");
  server.kill("SIGTERM");
  const [code] = await Promise.race([
    exited,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Preview did not shut down")), 5000),
    ),
  ]);
  if (code !== 0 && code !== 143) throw new Error(`Preview exited ${code}`);
  server = undefined;
  console.log("Packed consumer check, build, and independent preview passed.");
} finally {
  server?.kill("SIGKILL");
  await rm(temporary, { recursive: true, force: true });
}
