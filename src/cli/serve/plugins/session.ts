import { MockGASSession } from "../../../shared/gas";
import { ResolvedUserConfig } from "../../config";
import { GASUser } from "./user";

// https://developers.google.com/apps-script/reference/base/session
export class GASSession implements GoogleAppsScript.Base.Session {
  readonly #activeUser: GASUser;
  readonly #activeUserLocale: string;
  readonly #effectiveUser: GASUser;
  readonly #scriptTimeZone: string;
  readonly #temporaryActiveUserKey: string;

  constructor(config: ResolvedUserConfig, mock: MockGASSession) {
    this.#activeUser =
      config.gas.webapp!.executeAs === "USER_ACCESSING"
        ? new GASUser(mock.activeUserEmail ?? "active@gmail.com")
        : new GASUser(mock.effectiveUserEmail ?? "effective@gmail.com");
    this.#activeUserLocale = mock.activeUserLocale ?? "en";
    this.#effectiveUser = this.#activeUser;
    this.#scriptTimeZone = config.gas.timeZone!;
    this.#temporaryActiveUserKey =
      mock.temporaryActiveUserKey ??
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
  }

  getActiveUser(): GoogleAppsScript.Base.User {
    return this.#activeUser;
  }
  getActiveUserLocale(): string {
    return this.#activeUserLocale;
  }
  getEffectiveUser(): GoogleAppsScript.Base.User {
    return this.#effectiveUser;
  }
  getScriptTimeZone(): string {
    return this.#scriptTimeZone;
  }
  getTemporaryActiveUserKey(): string {
    return this.#temporaryActiveUserKey;
  }
  /** @deprecated DO NOT USE */
  getTimeZone(): string {
    throw new Error("Session#getTimeZone() is deprecated. Do not use.");
  }
  /** @deprecated DO NOT USE */
  getUser(): GoogleAppsScript.Base.User {
    throw new Error("Session#getUser() is deprecated. Do not use.");
  }
}
