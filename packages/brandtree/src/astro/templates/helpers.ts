import { relative } from "node:path";

export const relativePath = (from: string, to: string): string => {
  const path = relative(from, to).replaceAll("\\", "/");
  return path.startsWith(".") ? path : `./${path}`;
};
export const literal = (value: unknown): string =>
  JSON.stringify(value, null, 2);
