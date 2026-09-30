export interface LocalRuntimeProject {
  readonly root: string;
  readonly appsScript: {
    readonly manifest: {
      readonly timeZone?: string;
    };
  };
}
