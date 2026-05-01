/**
 * License / usage types.
 */

export interface SaasProtectionUsage {
  clientId: string;
  licensedSeats: number;
  usedSeats: number;
  archivedSeats?: number;
  asOf?: string;
  [key: string]: unknown;
}
