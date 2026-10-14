import { afterEach, expect, it, vi } from "vitest";
import { createRegenerationQueue } from "../src/cli/regenerate.ts";

afterEach(() => {
  vi.useRealTimers();
});

const setup = (regenerate = vi.fn().mockResolvedValue(undefined)) => {
  vi.useFakeTimers();
  const error = vi.fn();
  const queue = createRegenerationQueue(regenerate, error);
  return { queue, regenerate, error };
};

it("batches edits after a quiet period", async () => {
  const { queue, regenerate } = setup();
  queue.change("add", "/project/content/new.md");
  await vi.advanceTimersByTimeAsync(50);
  queue.change("change", "/project/content/page.md");
  await vi.advanceTimersByTimeAsync(99);
  expect(regenerate).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(regenerate).toHaveBeenCalledExactlyOnceWith([
    { event: "add", path: "/project/content/new.md" },
    { event: "change", path: "/project/content/page.md" },
  ]);
  await queue.close();
});

it("serializes edits arriving during regeneration", async () => {
  let finish!: () => void;
  const regenerate = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const { queue } = setup(regenerate);
  queue.change("change", "/project/content/initial.md");
  await vi.advanceTimersByTimeAsync(100);
  queue.change("change", "/project/content/page.md");
  queue.change("unlink", "/project/content/old.md");
  await vi.advanceTimersByTimeAsync(100);
  expect(regenerate).toHaveBeenCalledTimes(1);
  finish();
  await vi.advanceTimersByTimeAsync(0);
  expect(regenerate).toHaveBeenCalledTimes(2);
  expect(regenerate).toHaveBeenLastCalledWith([
    { event: "change", path: "/project/content/page.md" },
    { event: "unlink", path: "/project/content/old.md" },
  ]);
  await queue.close();
});

it("reports a failed regeneration and accepts later edits", async () => {
  const failure = new Error("Invalid edit");
  const { queue, regenerate, error } = setup(
    vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined),
  );
  queue.change("change", "/project/content/page.md");
  await vi.advanceTimersByTimeAsync(100);
  expect(error).toHaveBeenCalledExactlyOnceWith(failure);
  queue.change("change", "/project/content/page.md");
  await vi.advanceTimersByTimeAsync(100);
  expect(regenerate).toHaveBeenCalledTimes(2);
  await queue.close();
});

it("waits for active work, discards pending edits, and ignores edits after closing", async () => {
  let finish!: () => void;
  const regenerate = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const { queue } = setup(regenerate);
  queue.change("change", "/project/content/initial.md");
  await vi.advanceTimersByTimeAsync(100);
  queue.change("add", "/project/content/new.md");
  let stopped = false;
  const closing = queue.close().then(() => {
    stopped = true;
  });
  await vi.advanceTimersByTimeAsync(100);
  expect(stopped).toBe(false);
  expect(regenerate).toHaveBeenCalledTimes(1);
  finish();
  await closing;
  queue.change("change", "/project/content/page.md");
  await vi.advanceTimersByTimeAsync(100);
  expect(regenerate).toHaveBeenCalledTimes(1);
});
