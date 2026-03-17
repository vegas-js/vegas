// https://developers.google.com/apps-script/reference/base/user
export class User implements GoogleAppsScript.Base.User {
  readonly #email: string;

  constructor(email: string) {
    this.#email = email;
  }

  getEmail = () => {
    return this.#email;
  };
  /** @deprecated DO NOT USE */
  getUserLoginId = () => {
    throw new Error("User#getUserLoginId() is deprecated. Do not use.");
  };
}
