import { diagnosticsFromIssues } from "../core/diagnostics.ts";
import type { ResolvedConfig } from "../core/schema.ts";
import type { Diagnostic } from "../core/types.ts";

/** Semantic brand findings after the aggregate schema has validated its shape. */
export function collectBrandDiagnostics(
  config: Pick<ResolvedConfig, "brand" | "fonts">,
  options: { file?: string; source?: string } = {},
): Diagnostic[] {
  const declaredVariables = new Set(
    config.fonts.map(({ cssVariable }) => cssVariable),
  );
  const diagnostics: Diagnostic[] = [];

  const checkTypography = (
    typography: { display?: string; text?: string; mono?: string },
    path: string[],
  ) => {
    for (const role of ["display", "text", "mono"] as const) {
      const family = typography[role];
      if (family === undefined) continue;
      // Include nested/explicit fallbacks; deduplicate repeated references in
      // a field (including those added during font fallback resolution).
      const variables = new Set(
        [
          ...family.matchAll(/var\(\s*(--[a-zA-Z_][a-zA-Z0-9_-]*)\s*[,)]/gu),
        ].map((match) => match[1]!),
      );
      for (const variable of variables) {
        if (declaredVariables.has(variable)) continue;
        const findings = diagnosticsFromIssues(
          [
            {
              path: [...path, role],
              message: `Font variable "${variable}" is not declared in fonts.`,
            },
          ],
          {
            ...options,
            code: "BRANDTREE_FONT_VARIABLE_UNDECLARED",
            severity: "warning",
          },
        );
        diagnostics.push(
          ...findings.map((finding) => ({
            ...finding,
            suggestion: `Declare a font with cssVariable "${variable}" in fonts, or use an available font-family stack or an explicit var() fallback.`,
          })),
        );
      }
    }
  };

  checkTypography(config.brand.typography, ["brand", "typography"]);

  for (const [locale, override] of Object.entries(
    config.brand.localeOverrides ?? {},
  )) {
    if (override.typography) {
      checkTypography(override.typography, [
        "brand",
        "localeOverrides",
        locale,
        "typography",
      ]);
    }
  }

  return diagnostics;
}
