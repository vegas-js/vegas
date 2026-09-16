import childProcess from "node:child_process";

import type { GoogleOAuthAuthorizationUrlOpener } from "./google-oauth-login";

interface GoogleOAuthBrowserCommand {
  readonly command: string;
  readonly args: readonly string[];
}

interface CreateGoogleOAuthAuthorizationUrlOpenerOptions {
  readonly platform?: NodeJS.Platform;
  readonly launch?: (command: string, args: readonly string[]) => Promise<void>;
}

function requireAuthorizationUrl(url: string): string {
  if (url.trim().length === 0) {
    throw new Error("Google OAuth authorization URL is required.");
  }

  return url;
}

export function createGoogleOAuthBrowserCommand(
  platform: NodeJS.Platform,
  url: string,
): GoogleOAuthBrowserCommand {
  const authorizationUrl = requireAuthorizationUrl(url);

  switch (platform) {
    case "win32":
      return {
        command: "rundll32.exe",
        args: ["url.dll,FileProtocolHandler", authorizationUrl],
      };

    case "darwin":
      return {
        command: "open",
        args: [authorizationUrl],
      };

    case "linux":
      return {
        command: "xdg-open",
        args: [authorizationUrl],
      };

    default:
      throw new Error(`Unsupported platform for Google OAuth browser authorization: ${platform}`);
  }
}

function launchDetached(command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, [...args], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    const handleSpawn = () => {
      child.off("error", handleError);
      child.unref();
      resolve();
    };

    const handleError = (error: Error) => {
      child.off("spawn", handleSpawn);

      reject(new Error(`Failed to open Google OAuth authorization URL: ${error.message}`));
    };

    child.once("spawn", handleSpawn);
    child.once("error", handleError);
  });
}

export function createGoogleOAuthAuthorizationUrlOpener(
  options: CreateGoogleOAuthAuthorizationUrlOpenerOptions = {},
): GoogleOAuthAuthorizationUrlOpener {
  const platform = options.platform ?? process.platform;

  const launch = options.launch ?? launchDetached;

  return async (url: string): Promise<void> => {
    const browser = createGoogleOAuthBrowserCommand(platform, url);

    await launch(browser.command, browser.args);
  };
}
