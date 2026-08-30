import type { RuntimeServiceImplementation } from "../../../runtime/protocol";

export type SessionEnvironment = {
  executeAs: "USER_ACCESSING" | "USER_DEPLOYING";
  timeZone?: string;
  activeUserEmail?: string;
  effectiveUserEmail?: string;
  activeUserLocale?: string;
  temporaryActiveUserKey?: string;
};

export class SessionHandler implements RuntimeServiceImplementation<"Session"> {
  readonly #environment: SessionEnvironment;

  constructor(environment: SessionEnvironment) {
    this.#environment = environment;
  }

  getActiveUser() {
    return this.#environment.executeAs === "USER_ACCESSING"
      ? (this.#environment.activeUserEmail ?? "active@gmail.com")
      : (this.#environment.effectiveUserEmail ?? "effective@gmail.com");
  }
  getActiveUserLocale() {
    return this.#environment.activeUserLocale ?? "en";
  }
  getEffectiveUser() {
    return this.#environment.executeAs === "USER_ACCESSING"
      ? (this.#environment.activeUserEmail ?? "active@gmail.com")
      : (this.#environment.effectiveUserEmail ?? "effective@gmail.com");
  }
  getScriptTimeZone() {
    return this.#environment.timeZone ?? "UTC";
  }
  getTemporaryActiveUserKey() {
    return (
      this.#environment.temporaryActiveUserKey ??
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    );
  }
}
