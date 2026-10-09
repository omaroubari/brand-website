import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("../src/core/project-tree.ts", () => ({ scanProject: vi.fn() }));
vi.mock("../src/astro/generate.ts", () => ({ generateRuntime: vi.fn() }));

import { generateRuntime } from "../src/astro/generate.ts";
import { prepareProject } from "../src/cli/prepare.ts";
import { BrandtreeError } from "../src/core/diagnostics.ts";
import { scanProject } from "../src/core/project-tree.ts";
import type { BrandtreeProject } from "../src/core/project-tree.ts";
import type { Diagnostic } from "../src/core/types.ts";

const diagnostic: Diagnostic = {
  code: "INVALID_META",
  message: "Invalid metadata",
  severity: "error",
  file: "/project/content/page.mdx",
};
const exitError = new Error("Process exited");

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw exitError;
  });
  vi.mocked(generateRuntime).mockResolvedValue({
    warnings: [],
    structuralChange: false,
  });
});
afterEach(() => vi.restoreAllMocks());

it.each([
  { strict: false, severity: "error", aborts: false },
  { strict: true, severity: "error", aborts: true },
  { strict: true, severity: "warning", aborts: false },
] as const)(
  "reports $severity diagnostics to stderr with strict=$strict",
  async ({ strict, severity, aborts }) => {
    const project = {
      diagnostics: [{ ...diagnostic, severity }],
    } as BrandtreeProject;
    vi.mocked(scanProject).mockResolvedValue(project);
    const preparing = prepareProject({ root: "/project", strict });
    if (aborts) {
      await expect(preparing).rejects.toThrow("Preparation aborted");
      expect(process.exit).not.toHaveBeenCalled();
      expect(generateRuntime).not.toHaveBeenCalled();
    } else {
      await expect(preparing).resolves.toBe(project);
      expect(generateRuntime).toHaveBeenCalledWith(project);
      expect(process.exit).not.toHaveBeenCalled();
    }
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining("INVALID_META Invalid metadata"),
    );
    if (severity === "error") {
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining(
          aborts
            ? "Preparation aborted: diagnostics contain errors and strict mode is enabled."
            : "Continuing preparation with errors because strict mode is disabled.",
        ),
      );
    }
    expect(process.stdout.write).not.toHaveBeenCalled();
  },
);

it("reports thrown BrandtreeError diagnostics to stderr before aborting", async () => {
  vi.mocked(scanProject).mockRejectedValue(new BrandtreeError(diagnostic));
  await expect(prepareProject({ root: "/project" })).rejects.toBeInstanceOf(
    BrandtreeError,
  );
  expect(process.stderr.write).toHaveBeenCalledWith(
    expect.stringContaining("INVALID_META Invalid metadata"),
  );
  expect(process.stdout.write).not.toHaveBeenCalled();
  expect(process.exit).not.toHaveBeenCalled();
  expect(generateRuntime).not.toHaveBeenCalled();
});
