/**
 * Backup / restore-point types.
 */

export type BackupStatus = 'success' | 'partial' | 'failed';

export interface SaasProtectionBackup {
  id: string;
  seatId: string;
  startedAt: string;
  completedAt?: string;
  status: BackupStatus;
  itemCount?: number;
  [key: string]: unknown;
}
