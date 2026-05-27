import type { ApiEnvelope } from './authTypes';

export type ClassifyServiceRequest = {
  prompt: string;
};

export type ClassifyServiceResult = {
  categoryId: string | null;
  regionId: string | null;
};

export type ClassifyServiceResponse = ApiEnvelope<ClassifyServiceResult>;
