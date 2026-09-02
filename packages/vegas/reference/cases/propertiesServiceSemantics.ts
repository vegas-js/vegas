export function captureReferencePropertiesServiceSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const service = globals.PropertiesService;

  const document1 = service.getDocumentProperties();
  const document2 = service.getDocumentProperties();

  const script1 = service.getScriptProperties();
  const script2 = service.getScriptProperties();

  const user1 = service.getUserProperties();
  const user2 = service.getUserProperties();

  const describe = (value: unknown) => ({
    isNull: value === null,
    type: typeof value,
    stringify: value === null ? null : String(value as any),
  });

  return {
    document: {
      ...describe(document1),
      stableIdentity: document1 === document2,
    },
    script: {
      ...describe(script1),
      stableIdentity: script1 === script2,
    },
    user: {
      ...describe(user1),
      stableIdentity: user1 === user2,
    },
    identity: {
      documentEqualsScript: document1 === script1,
      documentEqualsUser: document1 === user1,
      scriptEqualsUser: script1 === user1,
    },
  };
}
