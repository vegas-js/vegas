import { runPushApplication } from "../push";
import { validateAuthProfileOption } from "./auth-profile-option";

interface PushOptions {
  readonly profile?: string;
}

export async function runPush(root?: string, options: PushOptions = {}): Promise<void> {
  validateAuthProfileOption(options.profile);

  await runPushApplication(root, {
    profile: options.profile,
  });

  console.log("✓ Pushed project to Apps Script.");
}
