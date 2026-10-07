import { CliUsageError } from "./error";

export function validateAuthProfileOption(profile: string | undefined): void {
  if (profile !== undefined && profile.trim().length === 0) {
    throw new CliUsageError("Apps Script auth profile must not be empty.");
  }
}
