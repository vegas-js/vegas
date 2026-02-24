import { GASManifest } from "../../../../shared/config";
import { MockSession } from "../../../../shared/gas";
import { User } from "./User";

// https://developers.google.com/apps-script/reference/base/session
export function Session(gas: GASManifest, mock: MockSession): GoogleAppsScript.Base.Session {
  const activeUser =
    gas.webapp!.executeAs === "USER_ACCESSING"
      ? User(mock?.activeUserEmail ?? "active@gmail.com")
      : User(mock?.effectiveUserEmail ?? "effective@gmail.com");
  const activeUserLocale = mock?.activeUserLocale ?? "en";
  const effectiveUser = activeUser;
  const scriptTimeZone = gas.timeZone!;
  const temporaryActiveUserKey =
    mock?.temporaryActiveUserKey ??
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

  return {
    getActiveUser: function () {
      return activeUser;
    },
    getActiveUserLocale: function () {
      return activeUserLocale;
    },
    getEffectiveUser: function () {
      return effectiveUser;
    },
    getScriptTimeZone: function () {
      return scriptTimeZone;
    },
    getTemporaryActiveUserKey: function () {
      return temporaryActiveUserKey;
    },
    /** @deprecated DO NOT USE */
    getTimeZone: function () {
      throw new Error("Session#getTimeZone() is deprecated. Do not use.");
    },
    /** @deprecated DO NOT USE */
    getUser: function () {
      throw new Error("Session#getUser() is deprecated. Do not use.");
    },
  };
}
