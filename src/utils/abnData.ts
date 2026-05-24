import type { AbnLookupResult } from '../api/tradieTypes';

/** Shape expected by POST /tradies/business/setup `abnData` field. */
export type AbnDataPayload = {
  businessName?: string;
  status?: string;
  entityType?: string;
};

export function abnResultToApiPayload(result: AbnLookupResult): AbnDataPayload {
  const legacy = result as AbnLookupResult & { businessName?: string; status?: string };
  return {
    businessName: result.entityName?.trim() || legacy.businessName?.trim() || undefined,
    status: result.abnStatus?.trim() || legacy.status?.trim() || undefined,
    entityType: result.entityType?.trim() || undefined,
  };
}

export function abnResultToApiJson(result: AbnLookupResult): string {
  return JSON.stringify(abnResultToApiPayload(result));
}
