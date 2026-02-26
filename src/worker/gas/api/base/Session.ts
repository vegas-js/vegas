import { RequestSyncFn } from "../..";
import { User } from "./User";

// https://developers.google.com/apps-script/reference/base/session
export class Session implements GoogleAppsScript.Base.Session {
  readonly #requestSync: RequestSyncFn;

  constructor(requestSync: RequestSyncFn) {
    this.#requestSync = requestSync;
  }

  getActiveUser = () => {
    const email = this.#requestSync("vegas:Session#getActiveUser");
    return new User(email);
  };
  getActiveUserLocale = () => {
    const locale = this.#requestSync("vegas:Session#getActiveUserLocale");
    return locale;
  };
  getEffectiveUser = () => {
    const email = this.#requestSync("vegas:Session#getEffectiveUser");
    return new User(email);
  };
  getScriptTimeZone = () => {
    const timeZone = this.#requestSync("vegas:Session#getScriptTimeZone");
    return timeZone;
  };
  getTemporaryActiveUserKey = () => {
    const temporaryKey = this.#requestSync("vegas:Session#getTemporaryActiveUserKey");
    return temporaryKey;
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
