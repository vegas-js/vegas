import { describe, expect, test } from "vitest";

import { BuildCoordinator } from "./build-coordinator";

describe("BuildCoordinator", () => {
  test("resolve immediately when idle", async () => {
    const coordinator = new BuildCoordinator();

    await expect(coordinator.waitForIdle()).resolves.toBeUndefined();
  });

  test("wait until build completes", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });

    const coordinator = new BuildCoordinator();
    const build = coordinator.run(async () => {
      await gate;
    });

    let idle = false;
    const waiting = coordinator.waitForIdle().then(() => {
      idle = true;
    });

    await Promise.resolve();

    expect(idle).toBe(false);

    finish();

    await build;
    await waiting;

    expect(idle).toBe(true);
  });

  test("wait until queued build completes after previous build fails", async () => {
    let finishSecond!: () => void;

    const secondGate = new Promise<void>((resolve) => {
      finishSecond = resolve;
    });
    const coordinator = new BuildCoordinator();

    const first = coordinator.run(async () => {
      throw new Error("first failed");
    });
    const second = coordinator.run(async () => {
      await secondGate;
    });

    const waiting = coordinator.waitForIdle();

    await expect(first).rejects.toThrow("first failed");

    let idle = false;
    void waiting.then(() => {
      idle = true;
    });

    await Promise.resolve();

    expect(idle).toBe(false);

    finishSecond();
    await second;

    await expect(waiting).resolves.toBeUndefined();
  });

  test("run builds sequentially", async () => {
    let finishFirst!: () => void;
    const gate = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });

    const order: string[] = [];
    const coordinator = new BuildCoordinator();
    const first = coordinator.run(async () => {
      order.push("first:start");

      await gate;

      order.push("first:end");
    });

    const second = coordinator.run(async () => {
      order.push("second");
    });

    await Promise.resolve();

    expect(order).toStrictEqual(["first:start"]);

    finishFirst();
    await Promise.all([first, second]);

    expect(order).toStrictEqual(["first:start", "first:end", "second"]);
  });

  test("wait for all queued builds", async () => {
    let finishFirst!: () => void;
    let finishSecond!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      finishSecond = resolve;
    });

    const coordinator = new BuildCoordinator();
    const first = coordinator.run(async () => {
      await firstGate;
    });

    const waiting = coordinator.waitForIdle();
    const second = coordinator.run(async () => {
      await secondGate;
    });

    finishFirst();

    await first;

    let idle = false;

    void waiting.then(() => {
      idle = true;
    });

    await Promise.resolve();

    expect(idle).toBe(false);

    finishSecond();

    await second;
    await waiting;
  });

  test("resolve waiting requests when build fails", async () => {
    const coordinator = new BuildCoordinator();
    const error = new Error("build failed");
    const build = coordinator.run(async () => {
      throw error;
    });

    const waiting = coordinator.waitForIdle();

    await expect(build).rejects.toBe(error);
    await expect(waiting).resolves.toBeUndefined();
  });

  test("continue after failed build", async () => {
    const coordinator = new BuildCoordinator();

    await expect(
      coordinator.run(async () => {
        throw new Error("failed");
      }),
    ).rejects.toThrow("failed");

    let executed = false;
    await coordinator.run(async () => {
      executed = true;
    });

    expect(executed).toBe(true);
  });
});
