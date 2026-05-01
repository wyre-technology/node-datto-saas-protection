/**
 * Client (customer organization) types.
 */

export interface SaasProtectionClient {
  id: string;
  name: string;
  createdAt?: string;
  status?: string;
  [key: string]: unknown;
}
