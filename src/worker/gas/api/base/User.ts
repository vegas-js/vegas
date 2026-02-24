// https://developers.google.com/apps-script/reference/base/user
export function User(email: string): GoogleAppsScript.Base.User {
  return {
    getEmail: function () {
      return email;
    },
    /** @deprecated DO NOT USE */
    getUserLoginId: function () {
      throw new Error("User#getUserLoginId() is deprecated. Do not use.");
    },
  };
}
