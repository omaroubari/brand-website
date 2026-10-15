#!/usr/bin/env node

import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const built = fileURLToPath(new URL("../dist/cli/index.js", import.meta.url));
const source = fileURLToPath(new URL("../src/cli/index.ts", import.meta.url));
const entry = existsSync(built) ? built : source;
await import(pathToFileURL(entry).href);
