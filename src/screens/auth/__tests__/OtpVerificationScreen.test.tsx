/**
 * Unit tests for OtpVerificationScreen subtitle rendering.
 * Feature: auth-navigation-flow
 *
 * Tests that the subtitle correctly displays the destination (phone, email,
 * or fallback) based on which props are provided.
 *
 * Validates: Requirements 6.1, 6.2, 6.5
 */

import React from 'react';
import { create, act } from 'react-test-renderer';
import { OtpVerificationScreen, deriveOtpDestination } from '../OtpVerificationScreen';

// ─── Pure logic tests for deriveOtpDestination ───────────────────────────────

describe('deriveOtpDestination', () => {
  it('returns the phone number when phone is provided', () => {
    expect(deriveOtpDestination('+61412345678', undefined)).toBe('+61412345678');
  });

  it('returns the email when email is provided and phone is not', () => {
    expect(deriveOtpDestination(undefined, 'user@example.com')).toBe('user@example.com');
  });

  it('returns "your contact" when neither phone nor email is provided', () => {
    expect(deriveOtpDestination(undefined, undefined)).toBe('your contact');
  });

  it('prefers phone over email when both are provided', () => {
    expect(deriveOtpDestination('+61412345678', 'user@example.com')).toBe('+61412345678');
  });
});

// ─── Component rendering tests ────────────────────────────────────────────────

const noop = () => {};

function renderOtp(props: { phone?: string; email?: string }) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <OtpVerificationScreen
        phone={props.phone}
        email={props.email}
        onBack={noop}
        onVerified={noop}
      />,
    );
  });
  return renderer!;
}

/**
 * Recursively collects all text content from a react-test-renderer node tree.
 */
function getAllText(node: any): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(getAllText).join('');
  if (node.children) return getAllText(node.children);
  return '';
}

describe('OtpVerificationScreen subtitle rendering', () => {
  // Validates: Requirement 6.1
  it('renders "OTP has been sent to +61412345678." when phone is provided', () => {
    const renderer = renderOtp({ phone: '+61412345678' });
    const json = renderer.toJSON();
    const allText = getAllText(json);
    expect(allText).toContain('OTP has been sent to +61412345678.');
  });

  // Validates: Requirement 6.2
  it('renders "OTP has been sent to user@example.com." when email is provided', () => {
    const renderer = renderOtp({ email: 'user@example.com' });
    const json = renderer.toJSON();
    const allText = getAllText(json);
    expect(allText).toContain('OTP has been sent to user@example.com.');
  });

  // Validates: Requirement 6.5
  it('renders "OTP has been sent to your contact." when neither prop is provided', () => {
    const renderer = renderOtp({});
    const json = renderer.toJSON();
    const allText = getAllText(json);
    expect(allText).toContain('OTP has been sent to your contact.');
  });
});
