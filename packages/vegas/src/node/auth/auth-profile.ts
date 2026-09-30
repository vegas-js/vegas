export const DEFAULT_APPS_SCRIPT_AUTH_PROFILE = "default";

export function requireAppsScriptAuthProfile(profile: string): string {
  if (profile.trim().length === 0) {
    throw new Error("Apps Script auth profile is required.");
  }

  return profile;
}
