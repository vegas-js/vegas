import type { ServiceCaller } from "../../../runtime/protocol";
import { User } from "./User";

// https://developers.google.com/apps-script/reference/base/session
export class Session implements GoogleAppsScript.Base.Session {
  #callService: ServiceCaller;

  constructor(callService: ServiceCaller) {
    this.#callService = callService;
  }

  getActiveUser = () => {
    const email = this.#callService("Session", "getActiveUser");
    return new User(email);
  };
  getActiveUserLocale = () => {
    return this.#callService("Session", "getActiveUserLocale");
  };
  getEffectiveUser = () => {
    const email = this.#callService("Session", "getEffectiveUser");
    return new User(email);
  };
  getScriptTimeZone = () => {
    return this.#callService("Session", "getScriptTimeZone");
  };
  getTemporaryActiveUserKey = () => {
    return this.#callService("Session", "getTemporaryActiveUserKey");
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
