import { expect, it, vi } from "vitest";

vi.mock("../src/core/load-module.ts", () => ({ createModuleLoader: vi.fn() }));

import { createModuleLoader } from "../src/core/load-module.ts";
import { defineConfig } from "../src/core/config.ts";

it("imports the configuration API without initializing the Node module loader", () => {
  expect(typeof defineConfig).toBe("function");
  expect(createModuleLoader).not.toHaveBeenCalled();
});
