import type { RuntimeServicePort } from "../../../runtime/protocol";
import { User } from "./User";

// https://developers.google.com/apps-script/reference/base/session
export class Session implements GoogleAppsScript.Base.Session {
  #service: RuntimeServicePort<"Session">;

  constructor(service: RuntimeServicePort<"Session">) {
    this.#service = service;
  }

  getActiveUser = () => {
    const email = this.#service.getActiveUser();
    return new User(email);
  };
  getActiveUserLocale = () => {
    return this.#service.getActiveUserLocale();
  };
  getEffectiveUser = () => {
    const email = this.#service.getEffectiveUser();
    return new User(email);
  };
  getScriptTimeZone = () => {
    return this.#service.getScriptTimeZone();
  };
  getTemporaryActiveUserKey = () => {
    return this.#service.getTemporaryActiveUserKey();
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
