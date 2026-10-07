import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diagnosticsFromIssues } from "./diagnostics.ts";
import type { Diagnostic } from "./types.ts";

export interface LocalAssetReference {
  value: string;
  path: (string | number)[];
}

/** All asset fields use the same explicit prefixes, without network I/O. */
export function resolveLocalAssetPath(
  root: string,
  reference: Pick<LocalAssetReference, "value">,
): string | null {
  const { value } = reference;
  if (/^file:\/\/\//iu.test(value)) return fileURLToPath(new URL(value));
  if (/^file:/iu.test(value))
    throw new Error("Use file:/// for an explicit filesystem path");
  if (/^[a-z]:[\\/]/iu.test(value))
    throw new Error("Use file:/// for an explicit filesystem path");
  if (value.startsWith("//") || value.startsWith("#")) return null;
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) return null;
  if (value.startsWith("./")) return resolve(root, value);
  if (value.startsWith("/")) {
    const path = decodeURIComponent(value.split(/[?#]/u)[0]!);
    return resolve(root, "public", `.${path}`);
  }
  throw new Error(
    "Use ./ for a project-relative file, / for a public URL, or file:/// for an explicit filesystem path",
  );
}

export interface LocalAssetFailure {
  reference: LocalAssetReference;
  file?: string;
  reason: string;
}

/** Check each physical file once while reporting every affected authored field. */
export async function checkLocalAssets(
  references: readonly LocalAssetReference[],
  root: string,
): Promise<LocalAssetFailure[]> {
  const checks = new Map<string, Promise<string | null>>();
  const inspect = async (file: string): Promise<string | null> => {
    try {
      const handle = await open(file, "r");
      try {
        return (await handle.stat()).isFile()
          ? null
          : "Path is not a regular file";
      } finally {
        await handle.close();
      }
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };

  const results = await Promise.all(
    references.map(async (reference) => {
      let file: string | null;
      try {
        file = resolveLocalAssetPath(root, reference);
      } catch (error) {
        return {
          reference,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
      if (file === null) return null;
      let check = checks.get(file);
      if (!check) {
        check = inspect(file);
        checks.set(file, check);
      }
      const reason = await check;
      return reason === null ? null : { reference, file, reason };
    }),
  );
  return results.filter(
    (result): result is LocalAssetFailure => result !== null,
  );
}

/** Reuse the config diagnostic location and formatting contract for any asset. */
export function localAssetDiagnostics(
  failures: readonly LocalAssetFailure[],
  options: { file?: string; source?: string } = {},
): Diagnostic[] {
  return failures.flatMap(({ reference, file, reason }) =>
    diagnosticsFromIssues(
      [
        {
          path: reference.path,
          message: `Cannot read local asset "${reference.value}"${file ? ` (${file})` : ""}: ${reason}.`,
        },
      ],
      {
        ...options,
        code: "BRANDTREE_LOCAL_FILE_UNAVAILABLE",
        severity: "warning",
      },
    ).map((diagnostic) => ({
      ...diagnostic,
      suggestion:
        "Restore the file or correct this reference in brandtree.config.ts.",
    })),
  );
}
