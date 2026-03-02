import { requestSync } from "../..";
import { User } from "./User";

// https://developers.google.com/apps-script/reference/base/session
export class Session implements GoogleAppsScript.Base.Session {
  getActiveUser = () => {
    const email = requestSync({ message: "vegas:Session#getActiveUser" });
    return new User(email);
  };
  getActiveUserLocale = () => {
    const locale = requestSync({ message: "vegas:Session#getActiveUserLocale" });
    return locale;
  };
  getEffectiveUser = () => {
    const email = requestSync({ message: "vegas:Session#getEffectiveUser" });
    return new User(email);
  };
  getScriptTimeZone = () => {
    const timeZone = requestSync({ message: "vegas:Session#getScriptTimeZone" });
    return timeZone;
  };
  getTemporaryActiveUserKey = () => {
    const temporaryKey = requestSync({ message: "vegas:Session#getTemporaryActiveUserKey" });
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
