import packageJson from "../../package.json" with { type: "json" };

export async function readPackageVersion(): Promise<string> {
  return packageJson.version;
}
