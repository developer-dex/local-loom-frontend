/**
 * Auth API — thin wrappers around the raw HTTP helpers.
 * Each function maps 1-to-1 with an endpoint in the API docs.
 * Token injection is handled by the authenticated client (src/api/client.ts).
 */
import { apiPost, apiGet } from './http';
import { authenticatedPost, authenticatedGet } from './client';
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutResponse,
  ProfileResponse,
} from './authTypes';

const BASE = '/auth';

// ─── Public endpoints (no token required) ────────────────────────────────────

/**
 * POST /auth/signup
 * Sends multipart/form-data. Creates account and dispatches OTP.
 */
export async function signupApi(req: SignupRequest): Promise<SignupResponse> {
  const form = new FormData();
  form.append('fullName', req.fullName);
  form.append('phone', req.phone);
  form.append('role', req.role);
  if (req.email) form.append('email', req.email);
  if (req.profilePhotoUri) {
    // React Native FormData accepts { uri, name, type } objects
    form.append('profilePhoto', {
      uri: req.profilePhotoUri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }
  return apiPost<SignupResponse>(`${BASE}/signup`, { body: form });
}

/**
 * POST /auth/login
 * Sends OTP to an existing account's phone or email.
 */
export async function loginApi(req: LoginRequest): Promise<LoginResponse> {
  return apiPost<LoginResponse>(`${BASE}/login`, { body: req });
}

/**
 * POST /auth/verify-otp
 * Verifies the OTP and returns user + JWT tokens.
 */
export async function verifyOtpApi(req: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  return apiPost<VerifyOtpResponse>(`${BASE}/verify-otp`, { body: req });
}

/**
 * POST /auth/refresh-token
 * Exchanges a refresh token for a new token pair.
 * Called automatically by the authenticated client — rarely called directly.
 */
export async function refreshTokenApi(req: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  return apiPost<RefreshTokenResponse>(`${BASE}/refresh-token`, { body: req });
}

// ─── Protected endpoints (Bearer token required) ─────────────────────────────

/**
 * POST /auth/logout
 * Invalidates the server-side refresh token.
 */
export async function logoutApi(): Promise<LogoutResponse> {
  return authenticatedPost<LogoutResponse>(`${BASE}/logout`);
}

/**
 * GET /auth/profile
 * Returns the authenticated user's profile.
 */
export async function getProfileApi(): Promise<ProfileResponse> {
  return authenticatedGet<ProfileResponse>(`${BASE}/profile`);
}
