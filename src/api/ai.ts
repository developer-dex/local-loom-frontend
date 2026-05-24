/**
 * AI API — authenticated endpoints (Bearer access token).
 *
 * POST /ai/classify-service — classify user prompt into category + region
 */
import { authenticatedPost } from './client';
import type { ClassifyServiceRequest, ClassifyServiceResponse } from './aiTypes';

export async function classifyServiceApi(
  body: ClassifyServiceRequest,
): Promise<ClassifyServiceResponse> {
  return authenticatedPost<ClassifyServiceResponse>('/ai/classify-service', { body });
}
