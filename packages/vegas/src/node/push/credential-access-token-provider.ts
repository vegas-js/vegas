import {
  getUsableAppsScriptAccessToken,
  type AppsScriptAccessTokenProvider,
  type AppsScriptAccessTokenRefresher,
} from "./access-token";
import { DEFAULT_APPS_SCRIPT_AUTH_PROFILE, requireAppsScriptAuthProfile } from "./auth-profile";
import type { AppsScriptCredentialStore } from "./credential-store";
import { AppsScriptAuthPrerequisiteError } from "./error";

interface CreateAppsScriptCredentialAccessTokenProviderOptions {
  readonly credentialStore: AppsScriptCredentialStore;
  readonly refresher: AppsScriptAccessTokenRefresher;
  readonly profile?: string;
  readonly now?: () => number;
}

export function createAppsScriptCredentialAccessTokenProvider(
  options: CreateAppsScriptCredentialAccessTokenProviderOptions,
): AppsScriptAccessTokenProvider {
  const profile = requireAppsScriptAuthProfile(options.profile ?? DEFAULT_APPS_SCRIPT_AUTH_PROFILE);
  const now = options.now ?? Date.now;

  return {
    async getAccessToken(): Promise<string> {
      const credential = await options.credentialStore.load(profile);
      if (!credential) {
        throw new AppsScriptAuthPrerequisiteError(
          `Apps Script credentials not found for profile "${profile}". Run "vegas auth login <oauth-client-json> --profile <profile>" with the same profile name to sign in.`,
        );
      }

      const cachedAccessToken = getUsableAppsScriptAccessToken(credential, now());
      if (cachedAccessToken !== undefined) {
        return cachedAccessToken;
      }

      const refreshed = await options.refresher.refresh(credential);

      await options.credentialStore.save(profile, {
        ...credential,
        accessToken: refreshed.accessToken,
        expiryDate: refreshed.expiryDate,
      });

      return refreshed.accessToken;
    },
  };
}
