export function captureReferencePropertiesObjectSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const service = globals.PropertiesService;

  const key = `__vegas_reference_${Date.now()}_${Math.random()}`;
  const value = "vegas-reference-value";

  const scriptA = service.getScriptProperties();
  const scriptB = service.getScriptProperties();

  try {
    scriptA.setProperty(key, value);

    return {
      distinctObjects: scriptA !== scriptB,
      sharedBackingStore: scriptB.getProperty(key) === value,
      setPropertyReturnsReceiver: scriptA.setProperty(key, value) === scriptA,
      deletePropertyReturnsReceiver: scriptA.deleteProperty(key) === scriptA,
    };
  } finally {
    scriptA.deleteProperty(key);
  }
}
