import { expect, it } from "vitest";
import { htmlToMarkdown } from "../src/markdown/html";

it("preserves prose, GFM tables, code, quotes and asset URLs without UI chrome", () => {
  const markdown = htmlToMarkdown(
    `<h1>Brand</h1><p>A <strong>clear</strong> identity.</p>
<blockquote><p><strong>Note</strong></p><p>Keep <em>space</em>.</p></blockquote>
<table><thead><tr><th>Colour</th><th>Value</th></tr></thead><tbody><tr><td>A | B</td><td>#fff</td></tr></tbody></table>
<pre><code class="language-js">const x = '&lt;tag&gt;';\n</code></pre>
<p><a href="../logo">Logo</a> <a href="#rule">Rule</a><img src="/brand/logo.svg" alt="Brand logo"></p>
<script>secret()</script><style>p {color:red}</style><svg><text>decorative</text></svg><span aria-hidden="true">Copy</span>`,
    "https://brand.test/en/colour/",
  );
  expect(markdown).toContain("# Brand\n");
  expect(markdown).toContain("**clear**");
  expect(markdown).toContain("> **Note**");
  expect(markdown).toContain("A \\| B");
  expect(markdown).toContain("```js\nconst x = '<tag>';\n```");
  expect(markdown).toContain("[Logo](https://brand.test/en/logo)");
  expect(markdown).toContain("[Rule](#rule)");
  expect(markdown).toContain(
    "![Brand logo](https://brand.test/brand/logo.svg)",
  );
  expect(markdown).not.toMatch(/secret|color:red|decorative|Copy/);
});

it("preserves strikethrough and task-list state", () => {
  const markdown = htmlToMarkdown(
    '<p><del>Old rule</del></p><ul><li><input type="checkbox" checked disabled>Approved</li><li><input type="checkbox" disabled>Pending</li></ul>',
    "https://brand.test/guide/",
  );
  expect(markdown).toContain("~~Old rule~~");
  expect(markdown).toContain("- [x] Approved");
  expect(markdown).toContain("- [ ] Pending");
});
