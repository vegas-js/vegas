import type { AppsScriptCredential } from "./credential";

export interface AppsScriptCredentialStore {
  load(profile: string): Promise<AppsScriptCredential | undefined>;
  save(profile: string, credential: AppsScriptCredential): Promise<void>;
}
