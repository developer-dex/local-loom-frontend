/**
 * Categories API — public endpoints, no auth required.
 * GET /categories        — all active categories
 * GET /categories/:id    — single category by UUID
 */
import { apiGet } from './http';
import type { CategoriesResponse, CategoryResponse } from './categoryTypes';

/**
 * GET /categories
 * Returns all active categories ordered by sortOrder asc, name asc.
 */
export async function fetchCategoriesApi(): Promise<CategoriesResponse> {
  return apiGet<CategoriesResponse>('/categories');
}

/**
 * GET /categories/:id
 * Returns a single active category by UUID.
 */
export async function fetchCategoryByIdApi(id: string): Promise<CategoryResponse> {
  return apiGet<CategoryResponse>(`/categories/${encodeURIComponent(id)}`);
}
