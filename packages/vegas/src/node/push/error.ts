export class AppsScriptPushPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppsScriptPushPrerequisiteError";
  }
}
