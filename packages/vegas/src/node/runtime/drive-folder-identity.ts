import type { DriveFolder } from "./drive-folder";
import type { DriveFolderReference } from "./drive-reference";
import type { HostBridge } from "./host-bridge";

type DriveFolderIdentity = {
  readonly bridge: HostBridge;
  readonly reference: DriveFolderReference;
};

const driveFolderIdentities = new WeakMap<DriveFolder, DriveFolderIdentity>();

export function registerDriveFolderIdentity(
  folder: DriveFolder,
  bridge: HostBridge,
  reference: DriveFolderReference,
): void {
  driveFolderIdentities.set(folder, {
    bridge,
    reference: { ...reference },
  });
}

export function resolveDriveFolderReference(
  bridge: HostBridge,
  folder: DriveFolder,
): DriveFolderReference {
  const identity = driveFolderIdentities.get(folder);

  if (!identity || identity.bridge !== bridge) {
    throw new Error("Drive folder does not belong to this Runtime Drive.");
  }

  return { ...identity.reference };
}
