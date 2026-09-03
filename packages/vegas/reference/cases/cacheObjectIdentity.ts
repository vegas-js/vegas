export function captureReferenceCacheObjectIdentity() {
  const globals = globalThis as unknown as Record<string, any>;
  const cacheService = globals.CacheService;

  const scriptCacheA = cacheService.getScriptCache();
  const scriptCacheB = cacheService.getScriptCache();

  const userCacheA = cacheService.getUserCache();
  const userCacheB = cacheService.getUserCache();

  const privateCacheA = cacheService.getPrivateCache();
  const privateCacheB = cacheService.getPrivateCache();

  const publicCacheA = cacheService.getPublicCache();
  const publicCacheB = cacheService.getPublicCache();

  const documentCacheA = cacheService.getDocumentCache();
  const documentCacheB = cacheService.getDocumentCache();

  return {
    scriptCacheRepeatedSameObject: scriptCacheA === scriptCacheB,
    userCacheRepeatedSameObject: userCacheA === userCacheB,

    privateCacheRepeatedSameObject: privateCacheA === privateCacheB,
    publicCacheRepeatedSameObject: publicCacheA === publicCacheB,

    privateCacheSameObjectAsUserCache: privateCacheA === userCacheA,
    publicCacheSameObjectAsScriptCache: publicCacheA === scriptCacheA,

    scriptCacheSameObjectAsUserCache: scriptCacheA === userCacheA,

    documentCacheAvailable: documentCacheA !== null,
    documentCacheRepeatedSameObject:
      documentCacheA === null || documentCacheB === null ? null : documentCacheA === documentCacheB,
  };
}
