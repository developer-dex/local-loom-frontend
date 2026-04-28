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

export function validatePhone(value: string): string | null {
  if (!value) return 'Phone number is required.';
  if (value.length < 8) return 'Phone number is too short.';
  return null;
}

