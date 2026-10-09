import { spawn, type ChildProcess } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { get } from "node:http";
import { createServer } from "node:net";
import { expect, it } from "vitest";
import config from "../../../apps/sandbox/brandtree.config";

const response = (url: string): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const request = get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    request.on("error", reject);
    request.setTimeout(5000, () => request.destroy(new Error("HTTP timeout")));
  });
const childEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development" };
delete childEnv.VITEST;
const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check: () => Promise<boolean>, message: string) => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await check().catch(() => false)) return;
    await pause(200);
  }
  throw new Error(message);
};
const freePort = async () => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
};

it("updates original content and routes, retains config failures, recovers, and shuts down", async () => {
  await mkdir(join(packageRoot, "tmp"), { recursive: true });
  const root = await mkdtemp(join(packageRoot, "tmp", "brandtree-live-"));
  let child: ChildProcess | undefined;
  let logs = "";
  try {
    await mkdir(join(root, "node_modules"));
    await symlink(packageRoot, join(root, "node_modules/brandtree"), "dir");
    await writeFile(join(root, "package.json"), '{"type":"module"}');
    const authoredConfig = { ...config, fonts: [] };
    const configFile = join(root, "brandtree.config.ts");
    const saveConfig = (name: string) =>
      writeFile(
        configFile,
        `export default ${JSON.stringify({ ...authoredConfig, brand: { ...authoredConfig.brand, meta: { ...authoredConfig.brand.meta, name } } })};\n`,
      );
    await saveConfig("Live brand");
    await mkdir(join(root, "content/en"), { recursive: true });
    await mkdir(join(root, "components"));
    await mkdir(join(root, "assets"));
    await mkdir(join(root, "public"));
    const component = join(root, "components/AuthorNote.astro");
    const asset = join(root, "assets/mark.svg");
    await writeFile(
      asset,
      '<svg xmlns="http://www.w3.org/2000/svg" id="asset-initial"></svg>',
    );
    const note = (text: string) =>
      `---\nimport svg from '../assets/mark.svg?raw';\n---\n<p>${text}</p><div set:html={svg} />`;
    await writeFile(component, note("Component initial"));
    const page = join(root, "content/en/01-first.mdx");
    const body = (title: string, marker: string) =>
      `---\ntitle: ${title}\n---\nimport AuthorNote from '../../components/AuthorNote.astro';\n\n${marker}\n\n<AuthorNote />\n`;
    await writeFile(page, body("First", "Original content marker"));
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const html = async (path: string) => (await response(`${url}${path}`)).body;
    child = spawn(
      process.execPath,
      [
        join(packageRoot, "dist/cli/index.js"),
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { cwd: root, env: childEnv, stdio: ["ignore", "pipe", "pipe"] },
    );
    child.stdout?.on("data", (data) => {
      logs += data;
    });
    child.stderr?.on("data", (data) => {
      logs += data;
    });
    await until(
      async () => (await html("/en/first")).includes("Original content marker"),
      "Initial page did not render",
    );
    await writeFile(page, body("First updated", "Updated content marker"));
    await until(
      async () => (await html("/en/first")).includes("Updated content marker"),
      "Content edit failed",
    );
    await writeFile(component, note("Component updated"));
    await until(
      async () => (await html("/en/first")).includes("Component updated"),
      "Component edit failed",
    );
    await writeFile(
      asset,
      '<svg xmlns="http://www.w3.org/2000/svg" id="asset-updated"></svg>',
    );
    await until(
      async () => (await html("/en/first")).includes("asset-updated"),
      "Asset edit failed",
    );
    await writeFile(join(root, "public/marker.txt"), "Public asset updated");
    await until(
      async () => (await html("/marker.txt")).includes("Public asset updated"),
      "Public addition failed",
    );
    await writeFile(
      join(root, "content/en/02-added.md"),
      "---\ntitle: Added\n---\nNew route marker\n",
    );
    await until(
      async () => (await html("/en/added")).includes("New route marker"),
      "Page addition failed",
    );
    await rm(join(root, "content/en/02-added.md"));
    await until(
      async () => (await response(`${url}/en/added`)).status === 404,
      "Page deletion failed",
    );
    // Wait until deletion's restart finishes before saving the invalid config.
    await until(
      async () => (await html("/en/first")).includes("Updated content marker"),
      "Deletion restart failed",
    );
    const dataFile = join(root, ".brandtree/src/generated/data.json");
    const lastGood = await readFile(dataFile, "utf8");
    await writeFile(configFile, "export default { brand: ;\n");
    await until(
      async () => logs.includes("Regeneration failed:"),
      "Config failure was not reported",
    );
    expect(logs).toContain("brandtree.config.ts");
    expect(await readFile(dataFile, "utf8")).toBe(lastGood);
    expect(await html("/en/first")).toContain("Updated content marker");
    await saveConfig("Recovered brand");
    await until(
      async () => (await html("/en/first")).includes("Recovered brand"),
      "Config recovery failed",
    );
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const result = await Promise.race([
      exited,
      pause(5000).then(() => {
        throw new Error("Shutdown did not close resources");
      }),
    ]);
    expect([0, 143]).toContain(result[0]);
    child = undefined;
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : error}\n${logs.slice(-9000)}`,
    );
  } finally {
    child?.kill("SIGKILL");
    await rm(root, { recursive: true, force: true });
  }
}, 120_000);
