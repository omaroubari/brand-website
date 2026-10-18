import * as clack from "@clack/prompts";
import { defineCommand } from "citty";
import { resolve } from "pathe";

import { collectAnswers } from "./init/questions.ts";
import {
  applyPlan,
  buildPlan,
  detectPackageManager,
  ensureGitignore,
  nextSteps,
  PACKAGE_MANAGERS,
  type InitAnswers,
} from "./init/scaffold.ts";
import { logger } from "./log.ts";

export const initCommand = defineCommand({
  meta: { name: "init", description: "Scaffold a minimal Brandtree project." },
  args: {
    dir: {
      type: "positional",
      required: false,
      description: "Directory to scaffold into (default: current directory).",
    },
    title: { type: "string", description: "Brand name (default: My Brand)." },
    "package-manager": {
      type: "string",
      description: "Package manager for next steps (npm|pnpm|yarn|bun).",
    },
    yes: {
      type: "boolean",
      description: "Skip prompts and scaffold with defaults.",
    },
  },
  async run({ args }) {
    const pm = PACKAGE_MANAGERS.find(
      (candidate) => candidate === args["package-manager"],
    );
    if (args["package-manager"] !== undefined && pm === undefined) {
      throw new Error(
        `Unknown package manager "${args["package-manager"]}" (use ${PACKAGE_MANAGERS.join(" | ")}).`,
      );
    }
    if (args.title !== undefined && !args.title.trim())
      throw new Error("Give your brand a name.");
    const cwd = process.cwd();
    const interactive =
      !args.yes &&
      process.stdin.isTTY === true &&
      clack.isTTY(process.stdout) &&
      !clack.isCI();
    let answers: InitAnswers;
    if (interactive) {
      clack.intro("brandtree init");
      const collected = await collectAnswers(
        clack,
        {
          directory: args.dir,
          title: args.title,
          packageManager: pm,
        },
        { cwd, userAgent: process.env.npm_config_user_agent },
      );
      if (collected === null) {
        clack.cancel("Cancelled — nothing was written.");
        return;
      }
      answers = collected;
    } else {
      answers = {
        directory: args.dir ?? ".",
        title: args.title?.trim() ?? "My Brand",
        packageManager:
          pm ?? detectPackageManager(process.env.npm_config_user_agent),
      };
    }
    const root = resolve(cwd, answers.directory);
    const sink = interactive ? clack.log : logger;
    const { createdPackage } = await applyPlan(
      root,
      await buildPlan(root, answers),
      sink,
    );
    await ensureGitignore(root);
    const steps = nextSteps(answers, createdPackage);
    if (interactive) {
      clack.note(steps.trimEnd());
      clack.outro("You're all set.");
    } else {
      logger.box(steps);
    }
  },
});
