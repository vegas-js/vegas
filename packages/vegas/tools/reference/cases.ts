export interface ReferenceCaseDefinition {
  name: string;
  functionName: string;
  fixtureFile: string;
}

export const referenceCases: readonly ReferenceCaseDefinition[] = [
  {
    name: "smoke",
    functionName: "captureReferenceSmoke",
    fixtureFile: "smoke.json",
  },
  {
    name: "global-surface",
    functionName: "captureReferenceGlobalSurface",
    fixtureFile: "global-surface.json",
  },
];
