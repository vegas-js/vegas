export interface AppsScriptAccessTokenProvider {
  getAccessToken(): Promise<string>;
}
