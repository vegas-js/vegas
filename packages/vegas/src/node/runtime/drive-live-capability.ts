import type { DriveHostCallHandler } from "./drive-host-handler";

/**
 * Explicit opt-in boundary for live Google Drive access.
 *
 * The capability creates a per-invocation handler so live iterator state does
 * not share the local DriveStore or local iterator sessions.
 */
export interface DriveLiveCapability {
  createHandler(): DriveHostCallHandler;
}
