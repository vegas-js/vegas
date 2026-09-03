export interface ReferenceCaseDefinition {
  name: string;
  functionName: string;
  fixtureFile: string;
  runtimeTest: "required" | "pending";
}

export const referenceCases: readonly ReferenceCaseDefinition[] = [
  {
    name: "smoke",
    functionName: "captureReferenceSmoke",
    fixtureFile: "smoke.json",
    runtimeTest: "required",
  },
  {
    name: "global-surface",
    functionName: "captureReferenceGlobalSurface",
    fixtureFile: "global-surface.json",
    runtimeTest: "required",
  },
  {
    name: "mime-type-surface",
    functionName: "captureReferenceMimeTypeSurface",
    fixtureFile: "mime-type-surface.json",
    runtimeTest: "required",
  },
  {
    name: "builtin-global-surface",
    functionName: "captureReferenceBuiltinGlobalSurface",
    fixtureFile: "builtin-global-surface.json",
    runtimeTest: "pending",
  },
  {
    name: "global-object-surface",
    functionName: "captureReferenceGlobalObjectSurface",
    fixtureFile: "global-object-surface.json",
    runtimeTest: "pending",
  },
  {
    name: "enum-like-surface",
    functionName: "captureReferenceEnumLikeSurface",
    fixtureFile: "enum-like-surface.json",
    runtimeTest: "pending",
  },
  {
    name: "enum-member-surface",
    functionName: "captureReferenceEnumMemberSurface",
    fixtureFile: "enum-member-surface.json",
    runtimeTest: "pending",
  },
  {
    name: "cache-service-surface",
    functionName: "captureReferenceCacheServiceSurface",
    fixtureFile: "cache-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "lock-service-surface",
    functionName: "captureReferenceLockServiceSurface",
    fixtureFile: "lock-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "html-service-surface",
    functionName: "captureReferenceHtmlServiceSurface",
    fixtureFile: "html-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "url-fetch-app-surface",
    functionName: "captureReferenceUrlFetchAppSurface",
    fixtureFile: "url-fetch-app-surface.json",
    runtimeTest: "required",
  },
  {
    name: "utilities-surface",
    functionName: "captureReferenceUtilitiesSurface",
    fixtureFile: "utilities-surface.json",
    runtimeTest: "required",
  },
  {
    name: "spreadsheet-app-surface",
    functionName: "captureReferenceSpreadsheetAppSurface",
    fixtureFile: "spreadsheet-app-surface.json",
    runtimeTest: "required",
  },
  {
    name: "session-service-surface",
    functionName: "captureReferenceSessionServiceSurface",
    fixtureFile: "session-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "session-deprecated-semantics",
    functionName: "captureReferenceSessionDeprecatedSemantics",
    fixtureFile: "session-deprecated-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "properties-service-surface",
    functionName: "captureReferencePropertiesServiceSurface",
    fixtureFile: "properties-service-surface.json",
    runtimeTest: "required",
  },
  {
    name: "properties-service-semantics",
    functionName: "captureReferencePropertiesServiceSemantics",
    fixtureFile: "properties-service-semantics.json",
    runtimeTest: "required",
  },
  {
    name: "properties-object-surface",
    functionName: "captureReferencePropertiesObjectSurface",
    fixtureFile: "properties-object-surface.json",
    runtimeTest: "required",
  },
  {
    name: "properties-object-semantics",
    functionName: "captureReferencePropertiesObjectSemantics",
    fixtureFile: "properties-object-semantics.json",
    runtimeTest: "required",
  },
];
