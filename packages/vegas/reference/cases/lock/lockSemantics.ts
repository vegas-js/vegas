function captureCall(fn: () => unknown) {
  try {
    const value = fn();

    return {
      threw: false,
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      value:
        typeof value === "boolean" || typeof value === "number" || typeof value === "string"
          ? value
          : null,
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    const candidate = error as {
      name?: unknown;
      message?: unknown;
    } | null;

    return {
      threw: true,
      type: null,
      isNull: null,
      isUndefined: null,
      value: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

function captureHasLock(lock: any) {
  return captureCall(() => lock.hasLock());
}

export function captureReferenceLockSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const lockService = globals.LockService;

  const lifecycleLock = lockService.getScriptLock();

  const initial = captureHasLock(lifecycleLock);

  const releaseBeforeAcquire = captureCall(() => lifecycleLock.releaseLock());

  const afterReleaseBeforeAcquire = captureHasLock(lifecycleLock);

  const tryLockZero = captureCall(() => lifecycleLock.tryLock(0));

  const afterTryLock = captureHasLock(lifecycleLock);

  const releaseAfterTryLock = captureCall(() => lifecycleLock.releaseLock());

  const afterReleaseAfterTryLock = captureHasLock(lifecycleLock);

  const waitLockZero = captureCall(() => lifecycleLock.waitLock(0));

  const afterWaitLock = captureHasLock(lifecycleLock);

  const releaseAfterWaitLock = captureCall(() => lifecycleLock.releaseLock());

  const afterReleaseAfterWaitLock = captureHasLock(lifecycleLock);

  const reacquireAfterRelease = captureCall(() => lifecycleLock.tryLock(0));

  const afterReacquire = captureHasLock(lifecycleLock);

  lifecycleLock.releaseLock();

  const tryLockNoArgument = captureCall(() => {
    const lock = lockService.getScriptLock();

    return Reflect.apply(lock.tryLock, lock, []);
  });

  const waitLockNoArgument = captureCall(() => {
    const lock = lockService.getScriptLock();

    return Reflect.apply(lock.waitLock, lock, []);
  });

  const tryLockNegative = captureCall(() => {
    const lock = lockService.getScriptLock();

    return lock.tryLock(-1);
  });

  const waitLockNegative = captureCall(() => {
    const lock = lockService.getScriptLock();

    return lock.waitLock(-1);
  });

  const userLock = lockService.getUserLock();

  const userInitial = captureHasLock(userLock);

  const userTry = captureCall(() => userLock.tryLock(0));

  const userAfterTry = captureHasLock(userLock);

  const userRelease = captureCall(() => userLock.releaseLock());

  const userAfterRelease = captureHasLock(userLock);

  return {
    scriptLock: {
      stringify: String(lifecycleLock),

      initial,

      releaseBeforeAcquire,
      afterReleaseBeforeAcquire,

      tryLockZero,
      afterTryLock,

      releaseAfterTryLock,
      afterReleaseAfterTryLock,

      waitLockZero,
      afterWaitLock,

      releaseAfterWaitLock,
      afterReleaseAfterWaitLock,

      reacquireAfterRelease,
      afterReacquire,
    },

    validation: {
      tryLockNoArgument,
      waitLockNoArgument,
      tryLockNegative,
      waitLockNegative,
    },

    userLock: {
      stringify: String(userLock),

      initial: userInitial,

      tryLockZero: userTry,

      afterTryLock: userAfterTry,

      releaseAfterTryLock: userRelease,

      afterRelease: userAfterRelease,
    },
  };
}
