import {
  lstat,
  mkdir,
  readFile,
  writeFile,
  appendFile,
} from "node:fs/promises";
import { basename, dirname, join } from "pathe";

import { findConfigFile } from "../../core/project.ts";
import { readPackageVersion } from "../version.ts";
import { placeholderLogo, starterConfig, starterPages } from "./starter.ts";

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface InitAnswers {
  directory: string;
  title: string;
  packageManager: PackageManager;
}

export interface ScaffoldFile {
  path: string;
  content: string;
}

interface ScaffoldLog {
  info: (message: string) => void;
  success: (message: string) => void;
}

export const detectPackageManager = (userAgent?: string): PackageManager =>
  PACKAGE_MANAGERS.find((pm) => pm === userAgent?.split("/")[0]) ?? "npm";

export const titleize = (name: string): string =>
  name
    .replaceAll(/[-_.]+/gu, " ")
    .replaceAll(/\b\w/gu, (c) => c.toUpperCase())
    .trim() || "My Brand";

export const buildPlan = async (
  root: string,
  answers: InitAnswers,
): Promise<ScaffoldFile[]> => {
  const version = await readPackageVersion();
  const name =
    basename(root)
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]+/gu, "-")
      .replaceAll(/^-+|-+$/gu, "") || "my-brand";
  const files: ScaffoldFile[] = [
    {
      path: join(root, "package.json"),
      content: `${JSON.stringify(
        {
          name,
          private: true,
          type: "module",
          engines: { node: ">=22.12.0" },
          scripts: {
            dev: "brandtree dev",
            build: "brandtree build",
            check: "brandtree check",
            preview: "brandtree preview",
          },
          dependencies: { brandtree: `^${version}` },
        },
        null,
        2,
      )}\n`,
    },
    ...Object.entries(starterPages).map(([path, content]) => ({
      path: join(root, "content", path),
      content,
    })),
    {
      path: join(root, "public/brand/placeholder-dark.svg"),
      content: placeholderLogo("#000"),
    },
    {
      path: join(root, "public/brand/placeholder-light.svg"),
      content: placeholderLogo("#fff"),
    },
    {
      path: join(root, "public/favicon.svg"),
      content: placeholderLogo("#000"),
    },
  ];
  // Respect every supported config extension, not just brandtree.config.ts.
  if (!findConfigFile(root)) {
    files.push({
      path: join(root, "brandtree.config.ts"),
      content: `import { defineConfig } from "brandtree";\n\nexport default defineConfig(${JSON.stringify(starterConfig(answers.title), null, 2)});\n`,
    });
  }
  return files;
};

const hasCode = (error: unknown, code: string): boolean =>
  error instanceof Error && "code" in error && error.code === code;

/** Refuse symlink parents so a scaffold can't follow them outside the target. */
const ensureDirectory = async (path: string, root: string): Promise<void> => {
  if (path !== root) await ensureDirectory(dirname(path), root);
  try {
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(`Scaffold directory must be a real directory: ${path}`);
    }
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
    await mkdir(path, { recursive: path === root });
  }
};

export const applyPlan = async (
  root: string,
  files: ScaffoldFile[],
  log: ScaffoldLog,
): Promise<{ createdPackage: boolean }> => {
  // Validate all parents before writing any files.
  for (const file of files) await ensureDirectory(dirname(file.path), root);
  let createdPackage = false;
  for (const file of files) {
    try {
      // Exclusive creation protects existing files, including symlinks.
      await writeFile(file.path, file.content, {
        encoding: "utf-8",
        flag: "wx",
      });
      createdPackage ||= basename(file.path) === "package.json";
      log.success(`Created ${file.path}`);
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
      log.info(`Skipped existing ${file.path}`);
    }
  }
  return { createdPackage };
};

export const ensureGitignore = async (root: string): Promise<void> => {
  const path = join(root, ".gitignore");
  let content = "";
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error(`Refusing to update non-file ${path}`);
    content = await readFile(path, "utf-8");
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
  }
  const entries = new Set(
    content.split(/\r?\n/u).map((line) => line.trim().replace(/\/$/u, "")),
  );
  const missing = ["node_modules/", ".brandtree/", "dist/"].filter(
    (entry) => !entries.has(entry.slice(0, -1)),
  );
  if (missing.length)
    await appendFile(
      path,
      `${content && !content.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`,
    );
};

export const nextSteps = (
  answers: InitAnswers,
  createdPackage: boolean,
): string => {
  const pm = answers.packageManager;
  const steps: string[] = [];
  if (answers.directory !== ".")
    steps.push(`cd '${answers.directory.replaceAll("'", "'\\''")}'`);
  if (createdPackage) {
    steps.push(`${pm} install`);
    steps.push(pm === "npm" ? "npm run dev" : `${pm} dev`);
  } else {
    // Existing package.json is preserved, so it may have neither scripts nor Brandtree.
    steps.push(`${pm} add brandtree`);
    steps.push(
      `${{ npm: "npx", pnpm: "pnpm exec", yarn: "yarn", bun: "bunx" }[pm]} brandtree dev`,
    );
  }
  return `Next steps:\n\n  ${steps.join("\n  ")}\n`;
};
