import { colors } from "consola/utils";
import { relative } from "pathe";
import type { ZodError } from "zod";
import type { Diagnostic, DiagnosticSeverity } from "./types.ts";

/** A recoverable error carrying a structured diagnostic. */
export class BrandtreeError extends Error {
  readonly diagnostic: Diagnostic;

  constructor(diagnostic: Diagnostic, options: { cause?: unknown } = {}) {
    super(
      diagnostic.message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "BrandtreeError";
    this.diagnostic = diagnostic;
  }
}

const REGEXP_SPECIAL = /[$()*+.?[\\\]^{|}]/gu;
const escapeRegExp = (value: string): string =>
  value.replaceAll(REGEXP_SPECIAL, String.raw`\$&`);

/** A key segment scans the source text; an array index has no key to find. */
const isKeySegment = (segment: string | number): segment is string =>
  typeof segment === "string";

/**
 * Best-effort source position for a Zod issue path (e.g. `["seo", "title"]`) in
 * the raw config / frontmatter text. Narrows key-by-key — finding each string
 * segment as a `key:`/`key =` at or after the previous match — so a nested key
 * lands under its parent. Array indices are skipped. Returns 1-based line/column,
 * or undefined when nothing matches.
 */
const stepSegment = (
  source: string,
  segment: string | number,
  cursor: number,
) => {
  // A non-string path segment (array index) is skipped without moving on.
  if (!isKeySegment(segment)) {
    return { index: -1, next: cursor, stop: false };
  }
  // The negative lookbehind keeps a segment like `title` from matching the
  // tail of an unrelated key such as `subtitle:`.
  const matcher = new RegExp(
    `(?<![\\w$])${escapeRegExp(segment)}\\s*[:=]`,
    "gu",
  );
  matcher.lastIndex = cursor;
  const match = matcher.exec(source);
  if (!match) {
    return { index: -1, next: cursor, stop: true };
  }
  return { index: match.index, next: matcher.lastIndex, stop: false };
};

const locatePath = (
  source: string,
  path: readonly (string | number)[],
): { column: number; line: number } | undefined => {
  let cursor = 0;
  let found = -1;
  for (const segment of path) {
    const step = stepSegment(source, segment, cursor);
    if (step.stop) {
      break;
    }
    cursor = step.next;
    if (step.index >= 0) {
      found = step.index;
    }
  }
  if (found < 0) {
    return;
  }
  const before = source.slice(0, found);
  const lastNewline = before.lastIndexOf("\n");
  return { column: found - lastNewline, line: before.split("\n").length };
};

/** The YAML front matter block of a `.md`/`.mdx` source, if it has one. */
const FRONTMATTER = /^---\r?\n(?<body>[\s\S]*?)\r?\n---/u;

/**
 * Locate a front matter key in a content file, e.g. `["seo", "description"]` in
 * `docs/api.mdx`. Scoped to the front matter block so a `title:` written in the
 * page body can't be mistaken for the front matter key of the same name; returns
 * undefined when the file has no front matter or the key isn't set (a missing
 * key has no line to point at — callers anchor to the file instead).
 */
export const locateFrontmatterKey = (
  source: string,
  path: readonly (string | number)[],
): { column: number; line: number } | undefined => {
  const block = FRONTMATTER.exec(source);
  if (!block) {
    return;
  }
  // `locatePath` reports lines 1-based within the text it was given, and the
  // front matter body starts one line below the opening `---`.
  const position = locatePath(block.groups?.body ?? "", path);
  return position && { column: position.column, line: position.line + 1 };
};

/**
 * Convert generic validation issues (message + path, the shape shared by Zod
 * and Standard Schema issues) into Blume diagnostics, anchored to a file.
 */
export const diagnosticsFromIssues = (
  issues: readonly {
    message: string;
    path: readonly (string | number)[];
  }[],
  options: {
    code: string;
    file?: string;
    source?: string;
    severity?: DiagnosticSeverity;
  },
): Diagnostic[] =>
  issues.map((issue) => {
    const schemaPath = issue.path.join(".");
    const position = options.source
      ? locatePath(options.source, issue.path)
      : undefined;
    return {
      code: options.code,
      column: position?.column,
      file: options.file,
      line: position?.line,
      message: schemaPath ? `${schemaPath}: ${issue.message}` : issue.message,
      schemaPath: schemaPath || undefined,
      severity: options.severity ?? "error",
    } satisfies Diagnostic;
  });

/** Convert a ZodError into Blume diagnostics, anchored to a file. */
export const diagnosticsFromZod = (
  error: ZodError,
  options: { code: string; file?: string; source?: string },
): Diagnostic[] =>
  diagnosticsFromIssues(
    error.issues.map((issue) => ({
      message: issue.message,
      // Zod 4 paths are PropertyKey[]; a symbol segment has no place in a
      // dotted schema path or a source-position scan.
      path: issue.path.filter(
        (segment): segment is string | number => typeof segment !== "symbol",
      ),
    })),
    options,
  );

const severityColor = (severity: Diagnostic["severity"]) => {
  if (severity === "error") {
    return colors.red;
  }
  if (severity === "warning") {
    return colors.yellow;
  }
  return colors.blue;
};

/** Format a single diagnostic for terminal output. */
export const formatDiagnostic = (
  diagnostic: Diagnostic,
  root?: string,
): string => {
  const color = severityColor(diagnostic.severity);
  const lines: string[] = [
    `${color(colors.bold(diagnostic.code))} ${diagnostic.message}`,
  ];

  // An audit finding is about a built URL, and names the source file that fixes
  // it as a second line ("at /docs/api" / "in docs/api.mdx:3:2"). Everything
  // else is about a file alone, and keeps the original single `at file` line.
  if (diagnostic.url) {
    lines.push(`  ${colors.dim(`at ${diagnostic.url}`)}`);
  }
  if (diagnostic.file) {
    const location = root ? relative(root, diagnostic.file) : diagnostic.file;
    const column =
      diagnostic.column === undefined ? "" : `:${diagnostic.column}`;
    const position =
      diagnostic.line === undefined ? "" : `:${diagnostic.line}${column}`;
    const label = diagnostic.url ? "in" : "at";
    lines.push(`  ${colors.dim(`${label} ${location}${position}`)}`);
  }

  if (diagnostic.suggestion) {
    lines.push(`  ${colors.cyan(`fix: ${diagnostic.suggestion}`)}`);
  }

  if (diagnostic.docsUrl) {
    lines.push(`  ${colors.dim(`docs: ${diagnostic.docsUrl}`)}`);
  }

  return lines.join("\n");
};

export const hasErrors = (diagnostics: Diagnostic[]): boolean =>
  diagnostics.some((d) => d.severity === "error");

export const countBySeverity = (diagnostics: Diagnostic[]) => {
  const counts = { error: 0, info: 0, warning: 0 } satisfies Record<
    Diagnostic["severity"],
    number
  >;
  for (const diagnostic of diagnostics) {
    counts[diagnostic.severity] += 1;
  }
  return counts;
};
