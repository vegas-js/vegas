// https://developers.google.com/apps-script/reference/base/user
export class User {
  readonly #email: string;

  constructor(email: string) {
    this.#email = email;
  }

  getEmail(): string {
    return this.#email;
  }

  getUserLoginId(): string {
    return this.getEmail();
  }
}
