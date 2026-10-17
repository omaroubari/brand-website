---
name: component-docs
description: Writes and restructures UI component documentation around live previews, copyable examples, and source-verified API references. Use when creating or improving component reference pages, MDX component catalogs, design-system docs, usage examples, or documentation previews.
---

# Component Docs

## Project scope

This skill belongs to the Brandtree repository. Use the current checkout’s
`apps/docs` app and verify APIs against `packages/brandtree/src`. Read the
Brandtree and Blume guidance in [EXAMPLES.md](EXAMPLES.md) before editing pages.

## Quick start

Read the component source and the project's documentation conventions. Explain what
it does in one sentence, show a working preview immediately, teach the smallest
use, demonstrate meaningful variations, and put the API reference last.

For a concrete page outline and Brandtree adaptation, see [EXAMPLES.md](EXAMPLES.md).

## Establish the contract

1. Identify the intended reader and authoring environment: MDX, Astro, React, or
   another framework. Infer these from the task and repository before asking.
2. Read the public exports, prop types, implementation, configuration schemas,
   and existing examples. Treat source as authoritative; plans and ADRs may
   describe APIs that do not exist yet.
3. Identify required inputs, defaults, children or slots, configuration dependencies,
   theme and responsive behavior, and surprising failure or precedence rules.
4. Reuse the project's preview, code-highlighting, and API-table infrastructure.
   Preserve routes and navigation unless restructuring them is part of the task.

## Page structure

Use this sequence; omit optional sections when they add no value:

1. **Name and description.** Use readable titles such as “Color Palette”; keep
   `ColorPalette` for code identifiers and examples. Apply readable names to
   navigation and catalog cards too, without changing routes. Describe the rendered result and purpose in a specific
   sentence. Avoid generic descriptions such as “Props, defaults, and examples.”
2. **Default preview.** Place a realistic preview directly below the introduction,
   with copyable code available beside it or in a Code tab. Avoid a redundant
   Preview heading and instructions explaining how tabs work.
3. **Usage.** Show the smallest working author-facing example, including required
   imports and props. Explain essential setup here and link to its configuration
   guide. Put a prerequisite before the preview only if it is needed to understand it.
4. **Examples.** Use task-focused headings such as “Select and order swatches” or
   “Keep two columns on small screens.” Explain the change briefly, then show
   matching preview and code. Choose useful variations rather than every prop
   permutation. Simple components may need only the default preview and Usage.
5. **Behavior, when needed.** Explain interactions: selector precedence, theme
   switching, breakpoint boundaries, empty states, invalid values, accessibility,
   or limitations. Use a precise heading such as “Selection behavior.”
6. **API reference.** List public props with type, required status, default, and
   concise meaning. Document children and named slots when supported. Distinguish
   required inputs, computed fallbacks, and literal defaults accurately.
7. **Related, when useful.** Link to a configuration guide or companion component
   with a reason to visit. Inline links are often enough; avoid routine closing cards.

## Example quality

- Make every example valid in the reader's environment. Include imports, assets,
  required context, and meaningful children; explain intentional placeholders.
- Keep displayed code and runnable previews aligned in props, content, and assets.
  Use existing raw-snippet imports or shared sources when available. Do not show
  preview harness code as the code readers should paste into their application.
- Use the configured brand, tokens, and fixtures. Keep structured brand facts in
  configuration and explanatory prose in documentation.
- A fixed-background example must actually supply that background. Show responsive
  and theme variations in the conditions that exercise them.
- Keep shared conventions in the catalog overview. Repeat required props in working
  code, but do not repeat global setup prose or restate the API table as a paragraph.
- Use concrete language and explain why an option matters. Reserve callouts for
  constraints or mistakes with real consequences.

## Verify and deliver

- Check examples against source: public names, prop types, defaults, IDs, and slots.
- Format changed files and run repository-required checks. For a live dev server,
  use supported isolated verification; do not stop it or overwrite its runtime.
- Verify pages and all new preview routes render. Where browser tooling is available,
  inspect layout, code tabs, narrow widths, themes, and local overflow. HTTP checks
  confirm rendering but do not establish visual correctness.
- Check heading order, links, asset paths, and displayed-code/preview parity.
- Report the changed pages, verification results, and any verification limits.
  Start with representative pages for a broad rewrite, then apply the agreed scope.
