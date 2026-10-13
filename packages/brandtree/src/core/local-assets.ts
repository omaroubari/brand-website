import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diagnosticsFromIssues } from "./diagnostics.ts";
import type { AssetReference, Diagnostic } from "./types.ts";

/**
 * Resolve an asset value to an absolute filename: ./ uses root, / uses root/public.
 * Returns null for URLs and anchors; throws for invalid local syntax. No file I/O.
 */
export function resolveLocalAssetPath(
  root: string,
  { value }: Pick<AssetReference, "value">,
): string | null {
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

/**
 * Preserve the authored reference and any resolution error.
 */
export function resolveAssetReference(
  root: string,
  reference: Pick<AssetReference, "value" | "path">,
): AssetReference {
  try {
    return {
      ...reference,
      file: resolveLocalAssetPath(root, reference),
    };
  } catch (error) {
    return {
      ...reference,
      file: null,
      resolutionError: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface LocalAssetFailure {
  reference: AssetReference;
  file?: string;
  reason: string;
}

/** Forward resolution errors and check each resolved file once, without reparsing. */
export async function checkLocalAssets(
  references: readonly AssetReference[],
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
      const { file } = reference;
      if (reference.resolutionError !== undefined)
        return { reference, reason: reference.resolutionError };
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
