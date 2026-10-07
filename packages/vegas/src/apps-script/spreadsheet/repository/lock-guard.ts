import type { SpreadsheetRepositoryMutationGuard } from "./repository";

const DEFAULT_SPREADSHEET_REPOSITORY_LOCK_TIMEOUT_MILLISECONDS = 30_000;

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

export interface SpreadsheetRepositoryScriptLockGuardOptions {
  readonly timeoutMilliseconds?: number;
}

/**
 * Creates a repository mutation guard backed by the Apps Script script lock.
 *
 * Script locks coordinate executions of the same Apps Script project. Separate
 * script projects that access the same spreadsheet are not coordinated by this guard.
 */
export function createSpreadsheetRepositoryScriptLockGuard(
  options: SpreadsheetRepositoryScriptLockGuardOptions = {},
): SpreadsheetRepositoryMutationGuard {
  return createSpreadsheetRepositoryLockGuard({
    getLock: () => LockService.getScriptLock(),
    timeoutMilliseconds:
      options.timeoutMilliseconds ?? DEFAULT_SPREADSHEET_REPOSITORY_LOCK_TIMEOUT_MILLISECONDS,
    flush: () => SpreadsheetApp.flush(),
  });
}
