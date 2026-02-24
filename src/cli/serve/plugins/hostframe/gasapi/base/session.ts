import { MockSession } from "../../../../../../shared/gas";
import { ResolvedUserConfig } from "../../../../../config";
import { GASUser } from "./user";

// https://developers.google.com/apps-script/reference/base/session
export class GASSession implements GoogleAppsScript.Base.Session {
  readonly #activeUser: GASUser;
  readonly #activeUserLocale: string;
  readonly #effectiveUser: GASUser;
  readonly #scriptTimeZone: string;
  readonly #temporaryActiveUserKey: string;

  constructor(config: ResolvedUserConfig, mock: MockSession) {
    this.#activeUser =
      config.gas.webapp!.executeAs === "USER_ACCESSING"
        ? new GASUser(mock?.activeUserEmail ?? "active@gmail.com")
        : new GASUser(mock?.effectiveUserEmail ?? "effective@gmail.com");
    this.#activeUserLocale = mock?.activeUserLocale ?? "en";
    this.#effectiveUser = this.#activeUser;
    this.#scriptTimeZone = config.gas.timeZone!;
    this.#temporaryActiveUserKey =
      mock?.temporaryActiveUserKey ??
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
  }

  getActiveUser = () => {
    return this.#activeUser;
  };
  getActiveUserLocale = () => {
    return this.#activeUserLocale;
  };
  getEffectiveUser = () => {
    return this.#effectiveUser;
  };
  getScriptTimeZone = () => {
    return this.#scriptTimeZone;
  };
  getTemporaryActiveUserKey = () => {
    return this.#temporaryActiveUserKey;
  };
  /** @deprecated DO NOT USE */
  getTimeZone = () => {
    throw new Error("Session#getTimeZone() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  getUser = () => {
    throw new Error("Session#getUser() is deprecated. Do not use.");
  };
}
