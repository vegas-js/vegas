import type { InvocationEnvironment } from "./invocation";

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

// https://developers.google.com/apps-script/reference/base/session
export class Session {
  readonly #activeUser: User;
  readonly #activeUserLocale: string;
  readonly #effectiveUser: User;
  readonly #scriptTimeZone: string;
  readonly #temporaryActiveUserKey: string;

  constructor(environment: InvocationEnvironment) {
    this.#activeUser = new User(environment.activeUserEmail);
    this.#activeUserLocale = environment.activeUserLocale;
    this.#effectiveUser = new User(environment.effectiveUserEmail);
    this.#scriptTimeZone = environment.scriptTimeZone;
    this.#temporaryActiveUserKey = environment.temporaryActiveUserKey;
  }

  getActiveUser(): User {
    return this.#activeUser;
  }

  getActiveUserLocale(): string {
    return this.#activeUserLocale;
  }

  getEffectiveUser(): User {
    return this.#effectiveUser;
  }

  getScriptTimeZone(): string {
    return this.#scriptTimeZone;
  }

  getTemporaryActiveUserKey(): string {
    return this.#temporaryActiveUserKey;
  }

  getTimeZone(): string {
    return this.getScriptTimeZone();
  }

  getUser(): User {
    return this.#activeUser;
  }
}

export function createSession(environment: InvocationEnvironment): Session {
  return new Session(environment);
}
