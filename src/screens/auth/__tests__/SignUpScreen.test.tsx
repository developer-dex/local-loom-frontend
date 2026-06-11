/**
 * Unit tests for SignUpScreen credential field.
 * Feature: auth-navigation-flow
 *
 * Validates: Requirements 4.1, 4.5, 4.6
 */

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../../../store/slices/authSlice', () => ({
  signupThunk: Object.assign(jest.fn(), {
    fulfilled: { match: () => false },
  }),
  clearError: jest.fn(),
}));

jest.mock('../../../store/hooks', () => {
  const state = { auth: { status: 'idle', error: null } };
  return {
    useAppDispatch: () => jest.fn(),
    useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
    selectAuthStatus: (s: typeof state) => s.auth.status,
    selectAuthError: (s: typeof state) => s.auth.error,
  };
});

jest.mock('../../../components/ui', () => {
  const React = require('react');
  const { TextInput, Pressable, Text, View } = require('react-native');
  return {
    AppTextField: ({
      label,
      value,
      onChangeText,
      error,
      keyboardType,
      autoComplete,
    }: {
      label: string;
      value: string;
      onChangeText: (v: string) => void;
      error?: string;
      keyboardType?: string;
      autoComplete?: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, label),
        React.createElement(TextInput, {
          value,
          onChangeText,
          keyboardType,
          autoComplete,
        }),
        error ? React.createElement(Text, null, error) : null,
      ),
    AppButton: ({
      title,
      onPress,
      disabled,
    }: {
      title: string;
      onPress: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: 'button' },
        React.createElement(Text, null, title),
      ),
    Icon: () => null,
    KeyboardFormScrollView: ({ children }: { children: unknown }) =>
      React.createElement(View, null, children),
    useToast: () => ({ showToast: jest.fn() }),
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import { SignUpScreen } from '../SignUpScreen';

const noop = () => {};

function getAllText(node: any): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(getAllText).join('');
  if (node.children) return getAllText(node.children);
  return '';
}

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

function selectRole(renderer: ReturnType<typeof create>, label: 'Service Providers' | 'Customers' = 'Customers') {
  const json = renderer.toJSON() as any;
  const tile = findPressableByText(json, label);
  if (!tile) throw new Error(`${label} role tile not found`);
  act(() => {
    tile.props.onPress();
  });
}

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

function isContinueDisabled(renderer: ReturnType<typeof create>): boolean {
  const json = renderer.toJSON() as any;

  function findContinueButton(node: any): any {
    if (!node || typeof node !== 'object') return null;
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
  if (!btn) return true;
  return btn.props?.disabled === true;
}

describe('SignUpScreen credential field', () => {
  it('renders name and phone-or-email fields for customers', () => {
    const renderer = renderSignUp();
    selectRole(renderer);
    const inputs = findAllTextInputs(renderer.toJSON() as any);
    expect(inputs).toHaveLength(2);
    expect(inputs[0].props?.autoComplete).toBe('name');
    expect(inputs[1].props?.keyboardType).toBe('email-address');
  });

  it('renders separate email and phone fields for service providers', () => {
    const renderer = renderSignUp();
    selectRole(renderer, 'Service Providers');
    const inputs = findAllTextInputs(renderer.toJSON() as any);
    expect(inputs).toHaveLength(3);
    expect(inputs[0].props?.autoComplete).toBe('name');
    expect(inputs[1].props?.autoComplete).toBe('email');
    expect(inputs[2].props?.autoComplete).toBe('tel');
  });

  it('Continue button is disabled when credential is empty', () => {
    const renderer = renderSignUp();
    selectRole(renderer);
    typeIntoInput(renderer, 0, 'Jane Smith');
    expect(isContinueDisabled(renderer)).toBe(true);
  });

  it('Continue button is disabled when credential is invalid email', () => {
    const renderer = renderSignUp();
    selectRole(renderer);
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 1, 'not-an-email');
    expect(isContinueDisabled(renderer)).toBe(true);
  });

  it('Continue button is disabled when credential is invalid phone', () => {
    const renderer = renderSignUp();
    selectRole(renderer);
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 1, '0412');
    expect(isContinueDisabled(renderer)).toBe(true);
  });

  it('Continue button is enabled for customer with valid email', () => {
    const renderer = renderSignUp();
    selectRole(renderer);
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 1, 'jane@example.com');
    expect(isContinueDisabled(renderer)).toBe(false);
  });

  it('Continue button is enabled for customer with valid phone', () => {
    const renderer = renderSignUp();
    selectRole(renderer);
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 1, '0412345678');
    expect(isContinueDisabled(renderer)).toBe(false);
  });

  it('Continue button is disabled for service providers without a profile photo', () => {
    const renderer = renderSignUp();
    selectRole(renderer, 'Service Providers');
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 1, 'jane@example.com');
    typeIntoInput(renderer, 2, '0412345678');
    expect(isContinueDisabled(renderer)).toBe(true);
  });

  it('Continue button is disabled for service providers with only email', () => {
    const renderer = renderSignUp();
    selectRole(renderer, 'Service Providers');
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 1, 'jane@example.com');
    expect(isContinueDisabled(renderer)).toBe(true);
  });

  it('Continue button is disabled for service providers with only phone', () => {
    const renderer = renderSignUp();
    selectRole(renderer, 'Service Providers');
    typeIntoInput(renderer, 0, 'Jane Smith');
    typeIntoInput(renderer, 2, '0412345678');
    expect(isContinueDisabled(renderer)).toBe(true);
  });
});
