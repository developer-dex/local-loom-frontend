/** Shared types for the Auth API — mirrors the API documentation exactly. */

export type UserRole = 'customer' | 'tradie';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type IdentifierType = 'phone' | 'email';

// ─── Envelope ────────────────────────────────────────────────────────────────

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiErrorEnvelope = {
  success: false;
  message: string;
  errors?: string[];
};

// ─── User ────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  isPhoneVerified: boolean;
  overallRating: number;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

// ─── POST /auth/signup ───────────────────────────────────────────────────────

export type SignupRequest = {
  fullName: string;
  phone: string;
  role: UserRole;
  email?: string;
  /** Native file URI — converted to FormData before sending. */
  profilePhotoUri?: string;
};

export type SignupResponse = ApiEnvelope<{
  phone: string;
  email?: string;
}>;

// ─── POST /auth/login ────────────────────────────────────────────────────────

export type LoginRequest = {
  identifier: string;
  identifierType: IdentifierType;
};

export type LoginResponse = ApiEnvelope<{
  identifierType: IdentifierType;
  maskedIdentifier: string;
}>;

// ─── POST /auth/verify-otp ───────────────────────────────────────────────────

export type VerifyOtpRequest = {
  identifier: string;
  identifierType: IdentifierType;
  code: string;
};

export type VerifyOtpResponse = ApiEnvelope<{
  user: AuthUser;
  tokens: AuthTokens;
}>;

// ─── POST /auth/refresh-token ────────────────────────────────────────────────

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RefreshTokenResponse = ApiEnvelope<AuthTokens>;

// ─── POST /auth/logout ───────────────────────────────────────────────────────

export type LogoutResponse = ApiEnvelope<null>;

// ─── GET /auth/profile ───────────────────────────────────────────────────────

export type ProfileResponse = ApiEnvelope<AuthUser>;
