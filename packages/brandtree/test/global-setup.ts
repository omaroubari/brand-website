import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export default function setup() {
  // Prepare shared output before any test worker can import it.
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    stdio: "inherit",
  });
}
