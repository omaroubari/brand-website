import { expect, it, vi } from "vitest";

import {
  collectAnswers,
  type InitFlags,
  type Prompter,
} from "../src/cli/init/questions.ts";

type TextOptions = Parameters<Prompter["text"]>[0];
type Step = {
  message: string;
  answer: string | symbol | ((options: TextOptions) => string);
};

const directoryQuestion = "Where should we create your project?";
const titleQuestion = "What's your brand called?";
const cancelled = Symbol("cancel");

// Fail on an unexpected question, and verify that every scripted step was used.
const scriptedPrompter = (steps: Step[]) => {
  let index = 0;
  const text = vi.fn<Prompter["text"]>(async (options) => {
    const step = steps[index++];
    expect(step, `Unexpected prompt: ${options.message}`).toBeDefined();
    expect(options.message).toBe(step!.message);
    return typeof step!.answer === "function"
      ? step!.answer(options)
      : step!.answer;
  });
  return {
    text,
    expectComplete: () => expect(index).toBe(steps.length),
  };
};

it("asks for directory then brand name and trims the submitted title", async () => {
  const prompter = scriptedPrompter([
    { message: directoryQuestion, answer: "my-brand" },
    { message: titleQuestion, answer: "  Example Brand  " },
  ]);
  expect(await collectAnswers(prompter, {}, { cwd: "/projects" })).toEqual({
    directory: "my-brand",
    title: "Example Brand",
    packageManager: "npm",
  });
  prompter.expectComplete();
});

it("offers the current directory by default and derives its title suggestion", async () => {
  const prompter = scriptedPrompter([
    {
      message: directoryQuestion,
      answer: (options) => {
        expect(options.defaultValue).toBe(".");
        expect(options.placeholder).toBe("./my-brand");
        return options.defaultValue!;
      },
    },
    {
      message: titleQuestion,
      answer: (options) => {
        expect(options.initialValue).toBe("Current Brand");
        return options.initialValue!;
      },
    },
  ]);
  expect(
    await collectAnswers(prompter, {}, { cwd: "/projects/current-brand" }),
  ).toEqual({ directory: ".", title: "Current Brand", packageManager: "npm" });
  prompter.expectComplete();
});

it.each([
  ["./nested/my-brand", "My Brand"],
  ["/other/another_brand.v2", "Another Brand V2"],
  ["../sibling-brand/", "Sibling Brand"],
  ["---", "My Brand"],
])("suggests a title for directory %s", async (directory, title) => {
  const prompter = scriptedPrompter([
    {
      message: titleQuestion,
      answer: (options) => {
        expect(options.initialValue).toBe(title);
        return options.initialValue!;
      },
    },
  ]);
  expect(
    await collectAnswers(prompter, { directory }, { cwd: "/projects" }),
  ).toEqual({ directory, title, packageManager: "npm" });
  prompter.expectComplete();
});

it.each([
  [{ directory: "site" }, [{ message: titleQuestion, answer: "Example" }]],
  [{ title: "Example" }, [{ message: directoryQuestion, answer: "site" }]],
] satisfies [InitFlags, Step[]][])(
  "skips only the questions supplied by flags: %j",
  async (flags, steps) => {
    const prompter = scriptedPrompter(steps);
    expect(await collectAnswers(prompter, flags, { cwd: "/projects" })).toEqual(
      {
        directory: "site",
        title: "Example",
        packageManager: "npm",
      },
    );
    prompter.expectComplete();
  },
);

it("validates blank and nonblank titles through the prompt validator", async () => {
  const prompter = scriptedPrompter([
    {
      message: titleQuestion,
      answer: (options) => {
        expect(options.validate).toBeTypeOf("function");
        for (const value of [undefined, "", " ", "\t\n"]) {
          expect(options.validate!(value)).toBe("Give your brand a name.");
        }
        expect(options.validate!("  علامة Brand  ")).toBeUndefined();
        return "  علامة Brand  ";
      },
    },
  ]);
  expect(
    await collectAnswers(prompter, { directory: "." }, { cwd: "/projects" }),
  ).toMatchObject({ title: "علامة Brand" });
  prompter.expectComplete();
});

it.each([
  [undefined, undefined, "npm"],
  ["unknown/1", undefined, "npm"],
  ["npm/11", undefined, "npm"],
  ["pnpm/11", undefined, "pnpm"],
  ["bun/1", undefined, "bun"],
  ["yarn/4", undefined, "yarn"],
  ["pnpm/11", "npm", "npm"],
  ["npm/11", "bun", "bun"],
] as const)(
  "resolves package manager from user agent %s and flag %s",
  async (userAgent, packageManager, expected) => {
    const prompter = scriptedPrompter([]);
    expect(
      await collectAnswers(
        prompter,
        { directory: ".", title: "Example", packageManager },
        { cwd: "/projects", userAgent },
      ),
    ).toEqual({ directory: ".", title: "Example", packageManager: expected });
    prompter.expectComplete();
  },
);

it.each([
  [{}, [{ message: directoryQuestion, answer: cancelled }]],
  [
    {},
    [
      { message: directoryQuestion, answer: "site" },
      { message: titleQuestion, answer: cancelled },
    ],
  ],
  [{ directory: "site" }, [{ message: titleQuestion, answer: cancelled }]],
  [{ title: "Example" }, [{ message: directoryQuestion, answer: cancelled }]],
] satisfies [InitFlags, Step[]][])(
  "stops immediately on cancellation with flags %j and script %j",
  async (flags, steps) => {
    const prompter = scriptedPrompter(steps);
    expect(
      await collectAnswers(prompter, flags, { cwd: "/projects" }),
    ).toBeNull();
    prompter.expectComplete();
  },
);
