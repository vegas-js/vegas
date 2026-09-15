export class BuildCoordinator {
  #pending = 0;
  #tail: Promise<void> = Promise.resolve();
  #idle: Promise<void> = Promise.resolve();

  #resolveIdle: (() => void) | null = null;

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
      () => this.#finish(),
      () => this.#finish(),
    );

    return execution;
  }

  waitForIdle(): Promise<void> {
    return this.#idle;
  }

  #startCycle(): void {
    this.#idle = new Promise<void>((resolve) => {
      this.#resolveIdle = resolve;
    });
  }

  #finish(): void {
    this.#pending -= 1;

    if (this.#pending !== 0) {
      return;
    }

    const resolveIdle = this.#resolveIdle;

    this.#idle = Promise.resolve();
    this.#resolveIdle = null;

    resolveIdle?.();
  }
}
