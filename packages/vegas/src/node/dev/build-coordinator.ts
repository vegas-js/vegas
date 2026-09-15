export class BuildCoordinator {
  #pending = 0;
  #tail: Promise<void> = Promise.resolve();
  #idle: Promise<void> = Promise.resolve();

  #resolveIdle: (() => void) | null = null;
  #rejectIdle: ((reason?: unknown) => void) | null = null;

  #hasError = false;
  #error: unknown;

  run(task: () => Promise<void>): Promise<void> {
    if (this.#pending === 0) {
      this.#startCycle();
    }

    this.#pending += 1;

    const execution = this.#tail.then(task);

    this.#tail = execution.then(
      () => undefined,
      () => undefined,
    );

    void execution.then(
      () => this.#finish(false),
      (error) => this.#finish(true, error),
    );

    return execution;
  }

  waitForIdle(): Promise<void> {
    return this.#idle;
  }

  #startCycle(): void {
    this.#hasError = false;
    this.#error = undefined;

    this.#idle = new Promise<void>((resolve, reject) => {
      this.#resolveIdle = resolve;
      this.#rejectIdle = reject;
    });

    void this.#idle.catch(() => undefined);
  }

  #finish(failed: boolean, error?: unknown): void {
    if (failed && !this.#hasError) {
      this.#hasError = true;
      this.#error = error;
    }

    this.#pending -= 1;

    if (this.#pending !== 0) {
      return;
    }

    const resolveIdle = this.#resolveIdle;
    const rejectIdle = this.#rejectIdle;

    this.#idle = Promise.resolve();
    this.#resolveIdle = null;
    this.#rejectIdle = null;

    if (this.#hasError) {
      rejectIdle?.(this.#error);
    } else {
      resolveIdle?.();
    }
  }
}
