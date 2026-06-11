// ─── Email ────────────────────────────────────────────────────────────────────

export const Email_Regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  if (!value) return 'Email is required.';
  if (!Email_Regex.test(value)) return 'Enter a valid email address.';
  return null;
}

export function sanitizeEmail(input: string): { value: string; hadInvalid: boolean } {
  const trimmed = input.trim();
  const lowered = trimmed.toLowerCase();
  const hadInvalid = trimmed !== input; // leading/trailing whitespace was present
  return { value: lowered, hadInvalid };
}

// ─── Credential type detection ────────────────────────────────────────────────

export type CredentialType = 'phone' | 'email' | 'empty';

export function detectCredentialType(value: string): CredentialType {
  if (!value) return 'empty';
  if (/^[\d+]/.test(value)) return 'phone';
  return 'email';
}

/** Validates a combined phone-or-email credential (sign-in / sign-up). */
export function validateCredential(value: string): string | null {
  const type = detectCredentialType(value);
  if (type === 'empty') return 'Phone number or email is required.';
  if (type === 'phone') return validatePhone(value, { completeOnly: true });
  return validateEmail(value);
}

/** Normalise credential input while typing (phone E.164 or lowercased email). */
export function normalizeCredentialInput(raw: string): string {
  const type = detectCredentialType(raw);
  if (type === 'phone') {
    return normalizeAustralianPhone(raw) || raw.replace(/[^\d+]/g, '');
  }
  return sanitizeEmail(raw).value;
}

// ─── Name ─────────────────────────────────────────────────────────────────────

export function isValidNameChar(ch: string): boolean {
  return /^[A-Za-z '\-]$/.test(ch);
}

export function sanitizeName(input: string): { value: string; hadInvalid: boolean } {
  let hadInvalid = false;
  let out = '';
  for (const ch of input) {
    if (isValidNameChar(ch)) out += ch;
    else hadInvalid = true;
  }
  // collapse multiple spaces
  out = out.replace(/\s+/g, ' ').trimStart();
  return { value: out, hadInvalid };
}

export function validateName(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Name is required.';
  if (v.length < 2) return 'Name is too short.';
  return null;
}

// ─── Australian phone ─────────────────────────────────────────────────────────

export const AU_PHONE_DIAL_CODE = '+61';
/** National significant number length (digits after +61). */
export const AU_PHONE_LOCAL_MAX_DIGITS = 9;
/** Full E.164 length, e.g. +61412345678 */
export const AU_PHONE_E164_MAX_LENGTH = 12;

/**
 * Australian E.164: +61 + 9 digits.
 * Mobile: 4xxxxxxxx; landline: 2/3/7/8 area codes.
 */
const AU_PHONE_E164_REGEX = /^\+61(?:4\d{8}|[2378]\d{8})$/;

/** Normalise input to +61XXXXXXXXX (max 9 national digits). */
export function normalizeAustralianPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';

  let nsn = digits;
  if (nsn.startsWith('61')) {
    nsn = nsn.slice(2);
  } else if (nsn.startsWith('0')) {
    nsn = nsn.slice(1);
  }
  nsn = nsn.slice(0, AU_PHONE_LOCAL_MAX_DIGITS);
  if (!nsn) return '';
  return `${AU_PHONE_DIAL_CODE}${nsn}`;
}

export function sanitizeAustralianPhone(input: string): { value: string; hadInvalid: boolean } {
  const hadInvalid = /[^\d+\s()-]/.test(input);
  const value = normalizeAustralianPhone(input);
  return { value, hadInvalid };
}

/** Build a `tel:` URI for Linking.openURL (digits and + only). */
export function phoneToTelUri(phone: string): string | null {
  const normalized = normalizeAustralianPhone(phone) || phone.trim().replace(/[^\d+]/g, '');
  return normalized.length >= 8 ? normalized : null;
}

/** @deprecated Use {@link sanitizeAustralianPhone}. */
export function sanitizePhone(input: string): { value: string; hadInvalid: boolean } {
  return sanitizeAustralianPhone(input);
}

export type ValidatePhoneOptions = {
  /** When true, partial numbers (still typing) are invalid — use for submit/buttons. */
  completeOnly?: boolean;
};

/** Validates an Australian E.164 phone number (e.g. "+61412345678"). */
export function validatePhone(value: string, options?: ValidatePhoneOptions): string | null {
  const completeOnly = options?.completeOnly ?? false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '+' || trimmed === AU_PHONE_DIAL_CODE) {
    return 'Phone number is required.';
  }

  const e164 = trimmed.startsWith('+') ? trimmed.slice(0, AU_PHONE_E164_MAX_LENGTH) : normalizeAustralianPhone(trimmed);

  if (!e164 || e164 === AU_PHONE_DIAL_CODE) {
    return 'Phone number is required.';
  }

  if (!e164.startsWith(AU_PHONE_DIAL_CODE)) {
    return 'Only Australian phone numbers (+61) are allowed.';
  }

  if (e164.length < AU_PHONE_E164_MAX_LENGTH) {
    return completeOnly ? 'Enter a valid Australian phone number.' : null;
  }

  if (!AU_PHONE_E164_REGEX.test(e164)) {
    return 'Enter a valid Australian phone number (e.g. 0412 345 678).';
  }

  return null;
}
