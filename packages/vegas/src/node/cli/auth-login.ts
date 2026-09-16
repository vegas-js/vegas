import { loginGoogleAppsScriptUser } from "../push";

interface AuthLoginOptions {
  readonly profile?: string;
}

export async function runAuthLogin(
  clientFilePath: string,
  options: AuthLoginOptions,
): Promise<void> {
  await loginGoogleAppsScriptUser({
    clientFilePath,
    profile: options.profile,
  });
}
