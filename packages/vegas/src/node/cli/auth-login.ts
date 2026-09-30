import { DEFAULT_APPS_SCRIPT_AUTH_PROFILE } from "../auth/auth-profile";
import { loginGoogleAppsScriptUser } from "../auth/user-login";
import { validateAuthProfileOption } from "./auth-profile-option";
import { CliUsageError } from "./error";

interface AuthLoginOptions {
  readonly profile?: string;
  readonly scope?: readonly string[];
}

export async function runAuth(
  action: string,
  clientFilePath: string | undefined,
  options: AuthLoginOptions,
): Promise<void> {
  if (action !== "login") {
    throw new CliUsageError(`Unknown auth command "${action}". Expected "login".`);
  }

  validateAuthProfileOption(options.profile);

  if (clientFilePath === undefined) {
    throw new CliUsageError(
      "OAuth client JSON is required. Usage: vegas auth login <client-file>.",
    );
  }

  await runAuthLogin(clientFilePath, options);
}

export async function runAuthLogin(
  clientFilePath: string,
  options: AuthLoginOptions,
): Promise<void> {
  await loginGoogleAppsScriptUser({
    clientFilePath,
    profile: options.profile,
    scopes: options.scope,
  });

  const profile = options.profile ?? DEFAULT_APPS_SCRIPT_AUTH_PROFILE;

  console.log(`✓ Signed in to Google for Apps Script using profile "${profile}".`);
}
