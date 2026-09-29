import type { SpreadsheetRepositoryMutationGuard } from "./spreadsheet-repository";

export interface SpreadsheetRepositoryLock {
  waitLock(timeoutMilliseconds: number): void;
  releaseLock(): void;
}

export interface SpreadsheetRepositoryLockGuardOptions {
  readonly getLock: () => SpreadsheetRepositoryLock;
  readonly timeoutMilliseconds: number;
  readonly flush: () => void;
}

export function createSpreadsheetRepositoryLockGuard(
  options: SpreadsheetRepositoryLockGuardOptions,
): SpreadsheetRepositoryMutationGuard {
  return {
    runExclusive<Result>(mutation: () => Result): Result {
      const lock = options.getLock();
      lock.waitLock(options.timeoutMilliseconds);

      try {
        return mutation();
      } finally {
        try {
          options.flush();
        } finally {
          lock.releaseLock();
        }
      }
    },
  };
}
