// https://developers.google.com/apps-script/reference/base/user
export class GASUser implements GoogleAppsScript.Base.User {
  readonly #email: string;

  constructor(email: string) {
    this.#email = email;
  }

  getEmail(): string {
    return this.#email;
  }
  /** @deprecated DO NOT USE */
  getUserLoginId(): string {
    throw new Error("User#getUserLoginId() is deprecated. Do not use.");
  }
}
