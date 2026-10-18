import { fileURLToPath } from "node:url";
import type { Expression, Identifier, Node, Program } from "estree";

const identifier = (name: string): Identifier => ({ type: "Identifier", name });

/** Walk ESTree, including expressions nested in author JSX and callbacks. */
function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object" && "type" in child)
          walk(child, visit);
      }
    } else if (value && typeof value === "object" && "type" in value) {
      walk(value as Node, visit);
    }
  }
}

/**
 * MDX plugin that supplies page-level `brand`, `ui`, and `dir` props to built-in
 * components while allowing authors to override them.
 */
export function injectBrandtreeBaseProps() {
  return (tree: Program): void => {
    const names = new Set<string>();
    walk(tree, (node) => {
      if (node.type === "Identifier") names.add(node.name);
    });
    const fresh = (hint: string): Identifier => {
      let name = hint;
      while (names.has(name)) name += "_";
      names.add(name);
      return identifier(name);
    };
    const inject = fresh("_injectMdxProps");
    const contentProps = fresh("_contentProps");
    const runtimes = new Set<string>();
    for (const statement of tree.body) {
      if (statement.type !== "ImportDeclaration") continue;
      if (
        /^astro\/jsx(?:-dev)?-runtime$/u.test(String(statement.source.value))
      ) {
        for (const specifier of statement.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            ["jsx", "jsxs", "jsxDEV"].includes(specifier.imported.name)
          ) {
            runtimes.add(specifier.local.name);
          }
        }
      }
    }
    // Find MDX's generated content-rendering function.
    const content = tree.body.find(
      (node) =>
        node.type === "FunctionDeclaration" &&
        node.id?.name === "_createMdxContent",
    );
    if (
      content?.type !== "FunctionDeclaration" ||
      content.params[0]?.type !== "Identifier"
    ) {
      throw new Error(
        "Brandtree MDX: expected the MDX content function with a props parameter.",
      );
    }
    const props = content.params[0];
    walk(content.body, (node) => {
      if (
        node.type !== "CallExpression" ||
        node.callee.type !== "Identifier" ||
        !runtimes.has(node.callee.name)
      ) {
        return;
      }
      const [component, authorProps] = node.arguments;
      if (
        !component ||
        !authorProps ||
        component.type === "SpreadElement" ||
        authorProps.type === "SpreadElement" ||
        component.type !== "Identifier"
      ) {
        return;
      }
      node.arguments[1] = {
        type: "CallExpression",
        callee: inject,
        optional: false,
        arguments: [
          component as Expression,
          authorProps as Expression,
          contentProps,
        ],
      };
    });
    // Capture at the content root: a nested callback named `props` must not
    // shadow the route's values. No page data is stored at module scope.
    content.body.body.unshift({
      type: "VariableDeclaration",
      kind: "const",
      declarations: [
        { type: "VariableDeclarator", id: contentProps, init: props },
      ],
    });
    tree.body.unshift({
      type: "ImportDeclaration",
      attributes: [],
      // Resolve from this compiler's package, not from the author's MDX
      // directory (which may have a different installed Brandtree version).
      source: {
        type: "Literal",
        value: fileURLToPath(import.meta.resolve("brandtree/core/mdx")),
      },
      specifiers: [
        {
          type: "ImportSpecifier",
          imported: identifier("injectMdxProps"),
          local: inject,
        },
      ],
    });
  };
}
