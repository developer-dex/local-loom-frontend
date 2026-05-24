import type { ApiEnvelope } from './authTypes';

export type ClassifyServiceRequest = {
  prompt: string;
};

export type ClassifyServiceResult = {
  categoryId: string;
  regionId: string;
};

export type ClassifyServiceResponse = ApiEnvelope<ClassifyServiceResult>;
