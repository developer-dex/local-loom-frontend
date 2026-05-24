/**
 * Regions API — public endpoints, no auth required.
 * GET /regions        — all active regions
 * GET /regions/:id    — single region by UUID
 */
import { apiGet } from './http';
import type { RegionsResponse, RegionResponse } from './regionTypes';

/**
 * GET /regions
 * Returns all active regions ordered alphabetically by name.
 */
export async function fetchRegionsApi(): Promise<RegionsResponse> {
  return apiGet<RegionsResponse>('/regions');
}

/**
 * GET /regions/:id
 * Returns a single active region by UUID.
 */
export async function fetchRegionByIdApi(id: string): Promise<RegionResponse> {
  return apiGet<RegionResponse>(`/regions/${encodeURIComponent(id)}`);
}
