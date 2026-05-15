/**
 * Restore types.
 */

export type RestoreStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Terminal statuses for a restore — polling stops here. */
export const TERMINAL_RESTORE_STATUSES: ReadonlyArray<RestoreStatus> = [
  'completed',
  'failed',
  'cancelled',
];

/**
 * Payload accepted by `POST /seats/{seatId}/restores`.
 *
 * The exact shape varies by seat type (mailbox vs OneDrive vs SharePoint).
 * The SDK exposes a permissive shape; callers can pass the JSON the API
 * expects for their target.
 */
export interface RestoreRequest {
  /** ID of the backup / restore-point to restore from. */
  backupId?: string;
  /** Optional restore destination override (e.g. another mailbox). */
  destination?: string;
  /** Optional list of item IDs to restore (when partial). */
  itemIds?: string[];
  [key: string]: unknown;
}

export interface SaasProtectionRestore {
  id: string;
  seatId: string;
  status: RestoreStatus;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  /** Populated once the restore actually starts running and Graph errors surface. */
  error?: string;
  [key: string]: unknown;
}

/** Result of `restores.queue()`. */
export interface QueuedRestore {
  restoreId: string;
  status: RestoreStatus;
}
