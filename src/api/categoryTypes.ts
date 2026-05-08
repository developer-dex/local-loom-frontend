/** Types for the Categories API — mirrors the API documentation exactly. */

import type { ApiEnvelope } from './authTypes';

export type Category = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoriesResponse = ApiEnvelope<Category[]>;
export type CategoryResponse = ApiEnvelope<Category>;
