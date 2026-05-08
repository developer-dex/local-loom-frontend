/**
 * Unit tests for SignInScreen credential handling.
 * Feature: auth-navigation-flow
 *
 * Tests that the screen correctly dispatches onSendOtp with the right payload
 * based on whether the credential is phone-type or email-type, and that the
 * empty-input error message is shown correctly.
 *
 * Validates: Requirements 5.4, 5.7, 5.8
 */

import React from 'react';
import { act, create } from 'react-test-renderer';
import { SignInScreen } from '../SignInScreen';

const noop = () => {};

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

/**
 * Finds a node by its testID or by matching a prop predicate.
 */
function findNodeByProp(node: any, propKey: string, propValue: any): any {
  if (!node || typeof node !== 'object') return null;
  if (node.props && node.props[propKey] === propValue) return node;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findNodeByProp(child, propKey, propValue);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Finds all nodes matching a type name.
 */
function findAllByType(node: any, typeName: string): any[] {
  if (!node || typeof node !== 'object') return [];
  const results: any[] = [];
  if (node.type === typeName) results.push(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      results.push(...findAllByType(child, typeName));
    }
  }
  return results;
}

/**
 * Simulates typing into the credential TextInput by finding the first
 * TextInput and calling its onChangeText handler.
 */
function typeCredential(renderer: ReturnType<typeof create>, value: string) {
  const json = renderer.toJSON() as any;
  const inputs = findAllByType(json, 'TextInput');
  if (!inputs.length) throw new Error('No TextInput found in SignInScreen');
  act(() => {
    inputs[0].props.onChangeText(value);
  });
}

/**
 * Presses the "Send OTP" button by finding the first Pressable/TouchableOpacity
 * that contains the text "Send OTP".
 */
function pressSendOtp(renderer: ReturnType<typeof create>) {
  const json = renderer.toJSON() as any;

  function findSendOtpPressable(node: any): any {
    if (!node || typeof node !== 'object') return null;
    // Check if this node is a pressable-like element containing "Send OTP" text
    if (
      (node.type === 'View' || node.type === 'Pressable') &&
      node.props?.onPress &&
      getAllText(node).includes('Send OTP')
    ) {
      return node;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = findSendOtpPressable(child);
        if (found) return found;
      }
    }
    return null;
  }

  const btn = findSendOtpPressable(json);
  if (!btn) throw new Error('Send OTP button not found');
  act(() => {
    btn.props.onPress();
  });
}

describe('SignInScreen credential handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Validates: Requirement 5.7
  it('calls onSendOtp({ phone: "0412345678", email: undefined }) for digit-leading input', () => {
    const onSendOtp = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<SignInScreen onBack={noop} onSendOtp={onSendOtp} />);
    });

    typeCredential(renderer!, '0412345678');
    pressSendOtp(renderer!);

    // Advance past the 250ms setTimeout
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onSendOtp).toHaveBeenCalledTimes(1);
    expect(onSendOtp).toHaveBeenCalledWith({ phone: '0412345678', email: undefined });
  });

  // Validates: Requirement 5.8
  it('calls onSendOtp({ email: "user@example.com", phone: undefined }) for letter-leading input', () => {
    const onSendOtp = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<SignInScreen onBack={noop} onSendOtp={onSendOtp} />);
    });

    typeCredential(renderer!, 'user@example.com');
    pressSendOtp(renderer!);

    // Advance past the 250ms setTimeout
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onSendOtp).toHaveBeenCalledTimes(1);
    expect(onSendOtp).toHaveBeenCalledWith({ email: 'user@example.com', phone: undefined });
  });

  // Validates: Requirement 5.4
  it('shows "Phone number or email is required." for empty input', () => {
    const onSendOtp = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<SignInScreen onBack={noop} onSendOtp={onSendOtp} />);
    });

    // Press submit without entering anything
    pressSendOtp(renderer!);

    // onSendOtp should NOT be called
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(onSendOtp).not.toHaveBeenCalled();

    // The error message should appear in the rendered output
    const json = renderer!.toJSON();
    const allText = getAllText(json);
    expect(allText).toContain('Phone number or email is required.');
  });
});
