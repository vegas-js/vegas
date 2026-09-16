import fs from "node:fs";

export interface ScaffoldFileState {
  readonly sourceExists: boolean;
  readonly destinationExists: boolean;
}

export function inspectScaffoldFileState(source: string, destination: string): ScaffoldFileState {
  return {
    sourceExists: fs.existsSync(source),
    destinationExists: fs.existsSync(destination),
  };
}

export function finalizeScaffoldFile(
  source: string,
  destination: string,
  before: ScaffoldFileState,
): void {
  if (before.sourceExists || !fs.existsSync(source)) {
    return;
  }

  if (before.destinationExists) {
    fs.rmSync(source, { force: true });
    return;
  }

  fs.renameSync(source, destination);
}
