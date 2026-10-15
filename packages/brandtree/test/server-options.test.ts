import { expect, it } from "vitest";
import { normalizeHost, parsePort } from "../src/cli/server-options.ts";

it.each([
  [undefined, 4321],
  ["1", 1],
  ["4321", 4321],
  ["65535", 65535],
])("parses port %j as %i", (input, expected) => {
  expect(parsePort(input)).toBe(expected);
});

it.each(["0", "-1", "65536", "1.5", "abc", "", "1e3"])(
  "rejects port %j with actionable input-specific guidance",
  (input) => {
    expect(() => parsePort(input)).toThrow(
      `Invalid --port "${input}" (expected an integer 1-65535).`,
    );
  },
);

it.each([
  [undefined, false],
  ["", true],
  ["127.0.0.1", "127.0.0.1"],
])("normalizes host %j to %j", (input, expected) => {
  expect(normalizeHost(input)).toBe(expected);
});
