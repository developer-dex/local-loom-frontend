/**
 * Unit tests for SignUpScreen email field.
 * Feature: auth-navigation-flow
 *
 * Tests that the email field is rendered in the correct position, that
 * onContinue is called with the full payload including email, and that the
 * Continue button is disabled when email is empty or invalid.
 *
 * Validates: Requirements 4.1, 4.5, 4.6
 */

import React from 'react';
import { act, create } from 'react-test-renderer';
import { SignUpScreen } from '../SignUpScreen';

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
 * Finds all TextInput nodes in the tree and returns them in order.
 */
function findAllTextInputs(node: any): any[] {
  if (!node || typeof node !== 'object') return [];
  const results: any[] = [];
  if (node.type === 'TextInput') results.push(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      results.push(...findAllTextInputs(child));
    }
  }
  return results;
}

/**
 * Finds a pressable-like node whose text content includes the given label.
 */
function findPressableByText(node: any, label: string): any {
  if (!node || typeof node !== 'object') return null;
  if (
    (node.type === 'View' || node.type === 'Pressable') &&
    node.props?.onPress &&
    getAllText(node).includes(label)
  ) {
    return node;
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findPressableByText(child, label);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Renders the SignUpScreen with the given onContinue callback.
 */
function renderSignUp(onContinue = noop) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <SignUpScreen
        onContinue={onContinue}
        onBack={noop}
        onSignIn={noop}
        onSkipToHome={noop}
      />,
    );
  });
  return renderer!;
}

/**
 * Selects a role tile by pressing the first role tile (Tradies).
 */
function selectRole(renderer: ReturnType<typeof create>) {
  const json = renderer.toJSON() as any;
  const tradieTile = findPressableByText(json, 'Tradies');
  if (!tradieTile) throw new Error('Tradies role tile not found');
  act(() => {
    tradieTile.props.onPress();
  });
}

/**
 * Types into the nth TextInput (0-indexed).
 */
function typeIntoInput(renderer: ReturnType<typeof create>, index: number, value: string) {
  const json = renderer.toJSON() as any;
  const inputs = findAllTextInputs(json);
  if (index >= inputs.length) {
    throw new Error(`TextInput at index ${index} not found (found ${inputs.length} inputs)`);
  }
  act(() => {
    inputs[index].props.onChangeText(value);
  });
}

/**
 * Presses the Continue button.
 */
function pressContinue(renderer: ReturnType<typeof create>) {
  const json = renderer.toJSON() as any;
  const btn = findPressableByText(json, 'Continue');
  if (!btn) throw new Error('Continue button not found');
  act(() => {
    btn.props.onPress();
  });
}

/**
 * Returns whether the Continue button is disabled.
 * AppButton renders a Pressable with disabled={true} when disabled.
 */
function isContinueDisabled(renderer: ReturnType<typeof create>): boolean {
  const json = renderer.toJSON() as any;

  function findContinueButton(node: any): any {
    if (!node || typeof node !== 'object') return null;
    // The Continue button is a Pressable containing the text "Continue"
    if (node.type === 'Pressable' && getAllText(node).includes('Continue')) {
      return node;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = findContinueButton(child);
        if (found) return found;
      }
    }
    return null;
  }

  const btn = findContinueButton(json);
  if (!btn) return true; // not found = treat as disabled
  return btn.props?.disabled === true;
}

describe('SignUpScreen email field', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Validates: Requirement 4.1
  it('renders email field between name and phone fields', () => {
    const renderer = renderSignUp();
    const json = renderer.toJSON() as any;
    const inputs = findAllTextInputs(json);

    // There should be at least 3 inputs: name, email, phone
    expect(inputs.length).toBeGreaterThanOrEqual(3);

    // The email input should have keyboardType="email-address"
    const emailInput = inputs.find(
      (input: any) => input.props?.keyboardType === 'email-address',
    );
    expect(emailInput).toBeDefined();

    // Verify order: name (index 0), email (index 1), phone (index 2)
    const emailIndex = inputs.indexOf(emailInput);
    const phoneInput = inputs.find(
      (input: any) => input.props?.keyboardType === 'phone-pad',
    );
    const phoneIndex = inputs.indexOf(phoneInput);

    // Name is before email
    expect(emailIndex).toBeGreaterThan(0);
    // Email is before phone
    expect(emailIndex).toBeLessThan(phoneIndex);
  });

  // Validates: Requirements 4.5, 4.6
  it('calls onContinue with { role, fullName, email, phone } on valid submission', () => {
    const onContinue = jest.fn();
    const renderer = renderSignUp(onContinue);

    // Select a role
    selectRole(renderer);

    // Type into name (index 0), email (index 1), phone (index 2)
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 1, 'jane@example.com');
    typeIntoInput(renderer, 2, '0412345678');

    pressContinue(renderer);

    // Advance past the 250ms setTimeout
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith({
      role: 'tradie',
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      phone: '0412345678',
    });
  });

  // Validates: Requirement 4.6
  it('Continue button is disabled when email is empty', () => {
    const renderer = renderSignUp();

    // Select role and fill name and phone but leave email empty
    selectRole(renderer);
    typeIntoInput(renderer, 0, 'Jane Smith');
    // Skip email (index 1)
    typeIntoInput(renderer, 2, '0412345678');

    expect(isContinueDisabled(renderer)).toBe(true);
  });

  // Validates: Requirement 4.6
  it('Continue button is disabled when email is invalid', () => {
    const renderer = renderSignUp();

    // Select role and fill all fields but with an invalid email
    selectRole(renderer);
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 1, 'not-an-email');
    typeIntoInput(renderer, 2, '0412345678');

    expect(isContinueDisabled(renderer)).toBe(true);
  });
});
