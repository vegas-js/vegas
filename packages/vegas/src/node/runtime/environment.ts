export type RuntimeDocumentPropertiesAvailability = "available" | "unavailable";

export interface RuntimeGlobalEnvironment {
  readonly properties: {
    readonly documentProperties: RuntimeDocumentPropertiesAvailability;
  };
}
