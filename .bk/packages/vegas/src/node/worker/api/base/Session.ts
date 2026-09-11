import { RequestSync } from "../..";
import { User } from "./User";

// https://developers.google.com/apps-script/reference/base/session
export class Session implements GoogleAppsScript.Base.Session {
  #requestSync: RequestSync;

  constructor(requestSync: RequestSync) {
    this.#requestSync = requestSync;
  }

  getActiveUser = () => {
    const email = this.#requestSync({ message: `${this.constructor.name}#getActiveUser` });
    return new User(email);
  };
  getActiveUserLocale = () => {
    const locale = this.#requestSync({ message: `${this.constructor.name}#getActiveUserLocale` });
    return locale;
  };
  getEffectiveUser = () => {
    const email = this.#requestSync({ message: `${this.constructor.name}#getEffectiveUser` });
    return new User(email);
  };
  getScriptTimeZone = () => {
    const timeZone = this.#requestSync({ message: `${this.constructor.name}#getScriptTimeZone` });
    return timeZone;
  };
  getTemporaryActiveUserKey = () => {
    const temporaryKey = this.#requestSync({
      message: `${this.constructor.name}#getTemporaryActiveUserKey`,
    });
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
