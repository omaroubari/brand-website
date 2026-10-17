# Page example: ColorPalette

The page title is “Color Palette”; the code identifier remains `ColorPalette`. The description is “Display your brand’s named color
swatches with optional print values.” The page then follows this outline:

```text
[Default preview / Code]

Usage
  Smallest working example
  Link to configuring brand colors

Examples
  Show primary colors
    Explanation + preview / code
  Select and order swatches
    Explanation + preview / code
  Hide print values
    Explanation + preview / code

Selection behavior
  Selector precedence and invalid IDs

API reference
  Props, types, requirements, defaults
```

The Usage example forwards the required inputs:

```mdx
<ColorPalette brand={props.brand} ui={props.ui} />
```

“Select and order swatches” explains the relationship between the selector and
configuration. The API table records the selector's type. Neither needs to
repeat the other's information.

# Brandtree and Blume adaptation

Use these conventions only in a repository that actually uses Brandtree and Blume.
Discover paths in the current checkout; do not assume a particular worktree ID.

- Brandtree components are available by name inside its content MDX. Forward
  required `props.brand`, `props.ui`, and `props.dir` explicitly. Custom components
  may still need imports. Verify each component's contract.
- In the docs app, Blume renders the documentation shell. Its own components have
  different APIs from the Brandtree components being documented.
- `apps/docs/docs/components/` contains the reference pages. ColorPalette, Logo,
  and Grid can serve as examples after confirming their current contents.
- `apps/docs/snippets/*.mdx` contains author-facing code, imported with `?raw`.
  `apps/docs/examples/*.astro` contains matching runnable previews. Harnesses
  resolve fixtures and use `previews/PreviewShell.astro`; snippets use MDX props.
- Use `ComponentPreview` for default and variation previews. Keep shared preview
  helpers outside `examples/` so they do not become standalone example routes.
- Image imports in snippets must explain their assumed content location. Keep
  local assets and configuration independent of other apps.
- Follow the checkout's README and CLI help for verification. Run `pnpm check`
  when required. If a running docs server blocks verification, use Blume's
  supported isolated mode, such as `blume check --strict --isolated`, after
  confirming the installed CLI supports it.
