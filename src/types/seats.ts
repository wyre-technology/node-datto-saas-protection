/**
 * Seat (mailbox / OneDrive / SharePoint site / Google user) types.
 */

export type SeatType = 'mailbox' | 'onedrive' | 'sharepoint' | 'google_user';

export interface SaasProtectionSeat {
  id: string;
  domainId: string;
  clientId: string;
  type: SeatType;
  email?: string;
  displayName?: string;
  archived?: boolean;
  lastBackupAt?: string;
  [key: string]: unknown;
}

/** Parameters accepted by seat-list endpoints. */
export interface SeatListParams {
  /** When true, include retained-but-deleted (archived) seats. */
  includeArchived?: boolean;
}
