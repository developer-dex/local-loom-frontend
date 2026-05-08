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
  if (/^\d/.test(value)) return 'phone';
  return 'email';
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

export function sanitizePhone(input: string): { value: string; hadInvalid: boolean } {
  const digitsOnly = input.replace(/[^\d]/g, '');
  return { value: digitsOnly, hadInvalid: digitsOnly.length !== input.length };
}

/** Validates an E.164 phone number (e.g. "+61412345678"). */
export function validatePhone(value: string): string | null {
  if (!value) return 'Phone number is required.';
  // Must start with + followed by 7–15 digits
  if (!/^\+\d{7,15}$/.test(value)) return 'Enter a valid phone number.';
  return null;
}

