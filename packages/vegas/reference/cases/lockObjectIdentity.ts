export function captureReferenceLockObjectIdentity() {
  const globals = globalThis as unknown as Record<string, any>;
  const lockService = globals.LockService;

  const scriptLockA = lockService.getScriptLock();
  const scriptLockB = lockService.getScriptLock();

  const userLockA = lockService.getUserLock();
  const userLockB = lockService.getUserLock();

  const privateLockA = lockService.getPrivateLock();
  const privateLockB = lockService.getPrivateLock();

  const publicLockA = lockService.getPublicLock();
  const publicLockB = lockService.getPublicLock();

  const documentLockA = lockService.getDocumentLock();
  const documentLockB = lockService.getDocumentLock();

  return {
    scriptLockRepeatedSameObject: scriptLockA === scriptLockB,
    userLockRepeatedSameObject: userLockA === userLockB,

    privateLockRepeatedSameObject: privateLockA === privateLockB,
    publicLockRepeatedSameObject: publicLockA === publicLockB,

    privateLockSameObjectAsUserLock: privateLockA === userLockA,
    publicLockSameObjectAsScriptLock: publicLockA === scriptLockA,

    scriptLockSameObjectAsUserLock: scriptLockA === userLockA,

    documentLockAvailable: documentLockA !== null,
    documentLockRepeatedSameObject:
      documentLockA === null || documentLockB === null ? null : documentLockA === documentLockB,
  };
}
