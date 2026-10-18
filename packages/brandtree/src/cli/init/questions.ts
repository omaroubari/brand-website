import { basename, resolve } from "pathe";
import {
  detectPackageManager,
  titleize,
  type InitAnswers,
  type PackageManager,
} from "./scaffold.ts";

export interface Prompter {
  text: (options: {
    message: string;
    defaultValue?: string;
    initialValue?: string;
    placeholder?: string;
    validate?: (value: string | undefined) => string | undefined;
  }) => Promise<string | symbol>;
}

export interface InitFlags {
  directory?: string;
  title?: string;
  packageManager?: PackageManager;
}

/** Collect everything before writing: cancelling never leaves a partial project. */
export const collectAnswers = async (
  prompter: Prompter,
  flags: InitFlags,
  defaults: { cwd: string; userAgent?: string },
): Promise<InitAnswers | null> => {
  const directory =
    flags.directory ??
    (await prompter.text({
      message: "Where should we create your project?",
      defaultValue: ".",
      placeholder: "./my-brand",
    }));
  if (typeof directory === "symbol") return null;
  const title =
    flags.title ??
    (await prompter.text({
      message: "What's your brand called?",
      initialValue: titleize(basename(resolve(defaults.cwd, directory))),
      validate: (value) =>
        value?.trim() ? undefined : "Give your brand a name.",
    }));
  if (typeof title === "symbol") return null;
  return {
    directory,
    title: title.trim(),
    packageManager:
      flags.packageManager ?? detectPackageManager(defaults.userAgent),
  };
};
