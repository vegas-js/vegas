export function captureReferenceUserObjectIdentity() {
  const globals = globalThis as unknown as Record<string, any>;
  const session = globals.Session;

  const activeUserA = session.getActiveUser();
  const activeUserB = session.getActiveUser();

  const effectiveUserA = session.getEffectiveUser();
  const effectiveUserB = session.getEffectiveUser();

  const deprecatedUserA = session.getUser();
  const deprecatedUserB = session.getUser();
  const activeUserForAliasComparison = session.getActiveUser();

  return {
    activeUserRepeatedSameObject: activeUserA === activeUserB,
    effectiveUserRepeatedSameObject: effectiveUserA === effectiveUserB,
    deprecatedGetUserRepeatedSameObject: deprecatedUserA === deprecatedUserB,
    deprecatedGetUserSameObjectAsActiveUser: deprecatedUserA === activeUserForAliasComparison,
  };
}
