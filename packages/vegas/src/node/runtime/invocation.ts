// https://developers.google.com/apps-script/reference/base/session
export interface InvocationEnvironment {
  readonly activeUserEmail: string;
  readonly activeUserLocale: string;
  readonly effectiveUserEmail: string;
  readonly scriptTimeZone: string;
  readonly temporaryActiveUserKey: string;
}
