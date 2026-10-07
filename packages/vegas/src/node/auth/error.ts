export class AppsScriptAuthPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppsScriptAuthPrerequisiteError";
  }
}
