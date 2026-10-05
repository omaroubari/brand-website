import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const output = resolve(root, "dist");
const config = ts.readConfigFile(
  resolve(root, "tsconfig.build.json"),
  ts.sys.readFile,
);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = [
  ...(config.error ? [config.error] : []),
  ...parsed.errors,
  ...ts.getPreEmitDiagnostics(program),
];
if (diagnostics.length) {
  process.stderr.write(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (name) => name,
      getCurrentDirectory: () => root,
      getNewLine: () => "\n",
    }),
  );
  process.exit(1);
}
await rm(output, { recursive: true, force: true });
if (program.emit().emitSkipped) throw new Error("Package emission failed");
