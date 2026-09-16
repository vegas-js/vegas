import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { requireAppsScriptAuthProfile } from "./auth-profile";
import {
  createAppsScriptCredentialFile,
  parseAppsScriptCredentialFile,
  type AppsScriptCredential,
  type AppsScriptCredentialFile,
} from "./credential";
import type { AppsScriptCredentialStore } from "./credential-store";

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

async function inspectCredentialFile(filePath: string): Promise<"missing" | "file"> {
  try {
    const stat = await fs.promises.lstat(filePath);

    if (stat.isSymbolicLink()) {
      throw new Error(`Apps Script credential file must not be a symbolic link: ${filePath}`);
    }

    if (!stat.isFile()) {
      throw new Error(`Apps Script credential file is not a file: ${filePath}`);
    }

    return "file";
  } catch (error) {
    if (isMissingFile(error)) {
      return "missing";
    }

    throw error;
  }
}

async function readCredentialFile(filePath: string): Promise<AppsScriptCredentialFile | undefined> {
  if ((await inspectCredentialFile(filePath)) === "missing") {
    return undefined;
  }

  const content = await fs.promises.readFile(filePath, "utf8");

  return parseAppsScriptCredentialFile(content);
}

async function writeCredentialFile(
  filePath: string,
  file: AppsScriptCredentialFile,
): Promise<void> {
  const directory = path.dirname(filePath);

  await fs.promises.mkdir(directory, {
    recursive: true,
    mode: 0o700,
  });

  if (process.platform !== "win32") {
    await fs.promises.chmod(directory, 0o700);
  }

  await inspectCredentialFile(filePath);

  const tempPath = path.join(directory, `.credentials-${crypto.randomUUID()}.tmp`);
  const content = `${JSON.stringify(file, null, 2)}\n`;

  try {
    const handle = await fs.promises.open(tempPath, "wx", 0o600);

    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }

    await fs.promises.rename(tempPath, filePath);

    if (process.platform !== "win32") {
      await fs.promises.chmod(filePath, 0o600);
    }
  } finally {
    await fs.promises.rm(tempPath, {
      force: true,
    });
  }
}

export function createAppsScriptFileCredentialStore(filePath: string): AppsScriptCredentialStore {
  return {
    async load(profile: string): Promise<AppsScriptCredential | undefined> {
      requireAppsScriptAuthProfile(profile);

      const file = await readCredentialFile(filePath);
      if (file === undefined || !Object.hasOwn(file.profiles, profile)) {
        return undefined;
      }

      return file.profiles[profile];
    },

    async save(profile: string, credential: AppsScriptCredential): Promise<void> {
      requireAppsScriptAuthProfile(profile);

      const current = await readCredentialFile(filePath);
      const profiles = {
        ...current?.profiles,
        [profile]: credential,
      };

      await writeCredentialFile(filePath, createAppsScriptCredentialFile(profiles));
    },
  };
}
