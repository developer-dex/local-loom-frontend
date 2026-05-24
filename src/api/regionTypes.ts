/** Types for the Regions API — mirrors the API documentation exactly. */

import type { ApiEnvelope } from './authTypes';

export type Region = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RegionsResponse = ApiEnvelope<Region[]>;
export type RegionResponse = ApiEnvelope<Region>;
