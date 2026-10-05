/** Type information only; the generated Vite alias resolves the JSON module. */
export const runtimeDataTypesTemplate =
  (): string => `declare module "brandtree:data" {
  const data: import("brandtree").RuntimeData;
  export default data;
}
`;
