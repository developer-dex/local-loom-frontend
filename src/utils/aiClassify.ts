import type { ClassifyServiceResult } from '../api/aiTypes';

/** Shown only when both categoryId and regionId are null or empty. */
export const AI_CLASSIFY_NO_MATCH_LABEL = "We couldn't find a match";

export const AI_CLASSIFY_NO_MATCH_MESSAGE =
  "We're sorry — we couldn't quite match your request to a service and area just yet. " +
  'Please try again with a little more detail about the job and where you need help. ' +
  "We'll do our best to point you in the right direction.";

/** Shown when the request fails or the response body is missing. */
export const AI_CLASSIFY_GENERIC_ERROR_MESSAGE =
  "We're sorry — something went wrong on our end. " +
  'Please try again in a moment, or rephrase your request if the issue continues.';

function hasNonEmptyId(value: string | null | undefined): boolean {
  return value != null && String(value).trim() !== '';
}

/** True when there is no data or both IDs are null/empty — show the polite no-match message. */
export function isClassifyResultFullyEmpty(
  data: ClassifyServiceResult | null | undefined,
): boolean {
  if (!data) return true;
  return !hasNonEmptyId(data.categoryId) && !hasNonEmptyId(data.regionId);
}

export function parseClassifyIds(data: ClassifyServiceResult | null | undefined): {
  categoryId?: string;
  regionId?: string;
} {
  if (!data) return {};
  const out: { categoryId?: string; regionId?: string } = {};
  if (hasNonEmptyId(data.categoryId)) out.categoryId = String(data.categoryId).trim();
  if (hasNonEmptyId(data.regionId)) out.regionId = String(data.regionId).trim();
  return out;
}
