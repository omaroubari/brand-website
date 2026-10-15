import { parseArgs, type ArgsDef, type ParsedArgs } from "citty";

export class InvalidPortError extends Error {}

/** Bare --host binds all interfaces; absent --host stays on localhost. */
export const normalizeHost = (host: string | undefined): boolean | string =>
  host === "" ? true : (host ?? false);

export const parsePort = (value: string | undefined): number => {
  const port = value === undefined ? 4321 : Number(value);
  if (
    value !== undefined &&
    (!/^\d+$/u.test(value) ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535)
  ) {
    throw new InvalidPortError(
      `Invalid --port "${value}" (expected an integer 1-65535).`,
    );
  }
  return port;
};

/** Let Citty parse flags after making a bare --host unambiguous. */
export const parseServerArgs = <T extends ArgsDef>(
  rawArgs: string[],
  definitions: T,
): ParsedArgs<T> =>
  parseArgs<T>(
    rawArgs.map((arg, index, all) =>
      arg === "--host" && (!all[index + 1] || all[index + 1].startsWith("-"))
        ? "--host="
        : arg,
    ),
    definitions,
  );
