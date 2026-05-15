/**
 * Domain (M365 tenant / Google Workspace domain) types.
 */

export type DomainProvider = 'm365' | 'google';

export interface SaasProtectionDomain {
  id: string;
  clientId: string;
  name: string;
  provider?: DomainProvider;
  createdAt?: string;
  [key: string]: unknown;
}
