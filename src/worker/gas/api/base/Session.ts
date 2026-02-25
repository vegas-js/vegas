import { RequestSyncFn } from "../..";
import { User } from "./User";

// https://developers.google.com/apps-script/reference/base/session
export function Session(requestSync: RequestSyncFn): GoogleAppsScript.Base.Session {
  return {
    getActiveUser: () => {
      const email = requestSync("vegas:Session#getActiveUser");
      return User(email);
    },
    getActiveUserLocale: () => {
      const locale = requestSync("vegas:Session#getActiveUserLocale");
      return locale;
    },
    getEffectiveUser: () => {
      const email = requestSync("vegas:Session#getEffectiveUser");
      return User(email);
    },
    getScriptTimeZone: () => {
      const timeZone = requestSync("vegas:Session#getScriptTimeZone");
      return timeZone;
    },
    getTemporaryActiveUserKey: () => {
      const temporaryKey = requestSync("vegas:Session#getTemporaryActiveUserKey");
      return temporaryKey;
    },
    /** @deprecated DO NOT USE */
    getTimeZone: () => {
      throw new Error("Session#getTimeZone() is deprecated. Do not use.");
    },
    /** @deprecated DO NOT USE */
    getUser: () => {
      throw new Error("Session#getUser() is deprecated. Do not use.");
    },
  };
}
