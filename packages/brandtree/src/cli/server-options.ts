import type { AstroInlineConfig } from "astro";

export const serverArgs = {
  host: { description: "Network host to bind.", type: "string" as const },
  port: { description: "Port to listen on.", type: "string" as const },
};

export const serverOptions = (args: {
  host?: string;
  port?: string;
}): Pick<AstroInlineConfig, "server"> => {
  const port = args.port === undefined ? undefined : Number(args.port);
  if (
    args.port !== undefined &&
    (!/^\d+$/u.test(args.port) ||
      !Number.isInteger(port) ||
      Number(port) > 65535)
  ) {
    throw new Error("--port must be an integer between 0 and 65535.");
  }
  return args.host === undefined && port === undefined
    ? {}
    : {
        server: {
          ...(args.host === undefined ? {} : { host: args.host }),
          ...(port === undefined ? {} : { port }),
        },
      };
};
