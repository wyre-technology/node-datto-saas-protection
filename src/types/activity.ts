/**
 * Activity log types.
 */

export interface SaasProtectionActivityEntry {
  id: string;
  clientId: string;
  timestamp: string;
  type?: string;
  message?: string;
  [key: string]: unknown;
}
