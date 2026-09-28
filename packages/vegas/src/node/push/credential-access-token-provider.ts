import {
  getUsableAppsScriptAccessToken,
  type AppsScriptAccessTokenProvider,
  type AppsScriptAccessTokenRefresher,
} from "./access-token";
import { DEFAULT_APPS_SCRIPT_AUTH_PROFILE, requireAppsScriptAuthProfile } from "./auth-profile";
import type { AppsScriptCredential } from "./credential";
import type { AppsScriptCredentialStore } from "./credential-store";
import { AppsScriptAuthPrerequisiteError, AppsScriptRemoteServiceError } from "./error";

interface CreateAppsScriptCredentialAccessTokenProviderOptions {
  readonly credentialStore: AppsScriptCredentialStore;
  readonly refresher: AppsScriptAccessTokenRefresher;
  readonly profile?: string;
  readonly requiredScopes?: readonly string[];
  readonly now?: () => number;
}

function resolveRequiredScopes(scopes: readonly string[] = []): readonly string[] {
  const resolvedScopes = new Set<string>();

  for (const scope of scopes) {
    const normalizedScope = scope.trim();

    if (normalizedScope.length === 0) {
      throw new Error("Apps Script required OAuth scope must not be empty.");
    }

    resolvedScopes.add(normalizedScope);
  }

  return [...resolvedScopes];
}

function requireCredentialScopes(
  credential: AppsScriptCredential,
  requiredScopes: readonly string[],
  profile: string,
): void {
  const grantedScopes = new Set(credential.scopes.map((scope) => scope.trim()));
  const missingScopes = requiredScopes.filter((scope) => !grantedScopes.has(scope));

  if (missingScopes.length === 0) {
    return;
  }

  throw new AppsScriptAuthPrerequisiteError(
    `Apps Script credentials for profile "${profile}" are missing required OAuth scopes: ${missingScopes.join(
      ", ",
    )}. Run "vegas auth login <oauth-client-json> --profile ${profile} --scope <scope>" again with the required scopes.`,
  );
}

export function createAppsScriptCredentialAccessTokenProvider(
  options: CreateAppsScriptCredentialAccessTokenProviderOptions,
): AppsScriptAccessTokenProvider {
  const profile = requireAppsScriptAuthProfile(options.profile ?? DEFAULT_APPS_SCRIPT_AUTH_PROFILE);
  const requiredScopes = resolveRequiredScopes(options.requiredScopes);
  const now = options.now ?? Date.now;

  return {
    async getAccessToken(request = {}): Promise<string> {
      request.signal?.throwIfAborted();

      const credential = await options.credentialStore.load(profile);
      request.signal?.throwIfAborted();

      if (!credential) {
        throw new AppsScriptAuthPrerequisiteError(
          `Apps Script credentials not found for profile "${profile}". Run "vegas auth login <oauth-client-json> --profile <profile>" with the same profile name to sign in.`,
        );
      }

      requireCredentialScopes(credential, requiredScopes, profile);

      const cachedAccessToken = getUsableAppsScriptAccessToken(
        credential,
        now(),
        request.minimumValidityMs,
      );
      if (cachedAccessToken !== undefined) {
        return cachedAccessToken;
      }

      const refreshed =
        request.signal === undefined
          ? await options.refresher.refresh(credential)
          : await options.refresher.refresh(credential, { signal: request.signal });
      request.signal?.throwIfAborted();

      const refreshedCredential = {
        ...credential,
        accessToken: refreshed.accessToken,
        expiryDate: refreshed.expiryDate,
      };
      const refreshedAccessToken = getUsableAppsScriptAccessToken(
        refreshedCredential,
        now(),
        request.minimumValidityMs,
      );

      if (refreshedAccessToken === undefined) {
        throw new AppsScriptRemoteServiceError(
          "Refreshed Apps Script access token does not satisfy the required minimum validity.",
        );
      }

      await options.credentialStore.save(profile, refreshedCredential);
      request.signal?.throwIfAborted();

      return refreshedAccessToken;
    },
  };
}
