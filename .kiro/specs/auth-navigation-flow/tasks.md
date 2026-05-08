# Implementation Plan: Auth & Navigation Flow

## Overview

Incremental implementation of five targeted changes: fix the onboarding "Get Started" destination, add email validation utilities, add an email field to sign-up, update sign-in to accept phone or email, and update the OTP screen to display whichever credential was used. Each task builds on the previous one so the app compiles and runs correctly at every step.

## Tasks

- [x] 1. Add email validation utilities to `src/utils/validation.ts`
  - Export `validateEmail(value: string): string | null` using `Email_Regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Export `sanitizeEmail(input: string): { value: string; hadInvalid: boolean }` that trims whitespace and lowercases
  - Export `CredentialType = 'phone' | 'email' | 'empty'` and `detectCredentialType(value: string): CredentialType`
  - Re-export all three from `src/utils/index.ts` (or wherever the barrel export lives) so existing import paths keep working
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 5.2, 5.3_

  - [x] 1.1 Write property test — Property 1: invalid emails always produce an error
    - Use `fast-check` to generate arbitrary non-empty strings that fail `Email_Regex`
    - Assert `validateEmail(value)` returns a non-null string
    - **Property 1: Invalid emails always produce an error**
    - **Validates: Requirements 4.3, 7.4**

  - [x] 1.2 Write property test — Property 2: valid emails never produce an error
    - Use `fc.emailAddress()` to generate valid email strings
    - Assert `validateEmail(value)` returns `null`
    - **Property 2: Valid emails never produce an error**
    - **Validates: Requirements 4.4, 7.5**

  - [x] 1.3 Write property test — Property 3: sanitize–validate round trip
    - Generate valid email strings, apply `sanitizeEmail`, then `validateEmail`
    - Assert result is `null`
    - **Property 3: Email sanitize–validate round trip**
    - **Validates: Requirements 7.6**

  - [x] 1.4 Write property test — Property 4: digit-leading inputs detected as phone
    - Use `fc.stringMatching(/^\d.*/)` to generate digit-leading strings
    - Assert `detectCredentialType(value)` returns `'phone'`
    - **Property 4: Digit-leading inputs are detected as phone**
    - **Validates: Requirements 5.2**

  - [x] 1.5 Write property test — Property 5: letter-leading inputs detected as email
    - Use `fc.stringMatching(/^[a-zA-Z.*/)` to generate letter-leading strings
    - Assert `detectCredentialType(value)` returns `'email'`
    - **Property 5: Letter-leading inputs are detected as email**
    - **Validates: Requirements 5.3**

- [x] 2. Fix onboarding "Get Started" navigation in `RootNavigator`
  - In the `Onboarding` screen handler inside `RootNavigator`, change `onComplete` from `() => navigation.navigate('SignUp')` to `() => navigation.navigate('MainTabs')`
  - `onSkip` already navigates to `MainTabs`; confirm it is unchanged
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Update `RootStackParamList` to support optional phone and email on the `Otp` route
  - In `src/navigation/types.ts`, change `Otp: { phone: string }` to `Otp: { phone?: string; email?: string }`
  - Verify TypeScript compilation passes after this change (no other files should break yet)
  - _Requirements: 6.3_

- [x] 4. Update `OtpVerificationScreen` to accept and display phone or email
  - Change `Props` so `phone` becomes optional (`phone?: string`) and add `email?: string`
  - Derive `destination = phone ?? email ?? 'your contact'` and render it in the subtitle: `"OTP has been sent to {destination}."`
  - _Requirements: 6.1, 6.2, 6.5_

  - [x] 4.1 Write unit tests for `OtpVerificationScreen` subtitle rendering
    - Test: renders `"OTP has been sent to +61412345678."` when `phone` is provided
    - Test: renders `"OTP has been sent to user@example.com."` when `email` is provided
    - Test: renders `"OTP has been sent to your contact."` when neither prop is provided
    - _Requirements: 6.1, 6.2, 6.5_

- [x] 5. Update `RootNavigator` `OtpScreen` to forward both `phone` and `email` params
  - Pass `email={route.params.email}` alongside the existing `phone={route.params.phone}` to `OtpVerificationScreen`
  - Update `SignIn` screen handler: change `onSendOtp={({ phone }) => navigation.navigate('Otp', { phone })}` to `onSendOtp={({ phone, email }) => navigation.navigate('Otp', { phone, email })}`
  - _Requirements: 6.3, 6.4_

- [x] 6. Update `SignInScreen` to accept phone or email credential
  - Change `Props.onSendOtp` signature to `(data: { phone?: string; email?: string }) => void`
  - Replace the phone-only state and field with a single `credential` state variable
  - Add a local `validateCredential` function that delegates to `validatePhone` or `validateEmail` based on `detectCredentialType`
  - Set `keyboardType="email-address"` on the credential field
  - Update `canSubmit` to use `validateCredential`
  - On submit, call `onSendOtp({ phone: credential })` for phone-type or `onSendOtp({ email: credential })` for email-type
  - Update placeholder text and label to reflect both input types (e.g., label "Phone or Email", placeholder "Phone number or email address")
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 6.1 Write unit tests for `SignInScreen` credential handling
    - Test: calls `onSendOtp({ phone: '0412345678', email: undefined })` for digit-leading input
    - Test: calls `onSendOtp({ email: 'user@example.com', phone: undefined })` for letter-leading input
    - Test: shows `"Phone number or email is required."` for empty input
    - _Requirements: 5.4, 5.7, 5.8_

- [x] 7. Add email field to `SignUpScreen`
  - Add `email` state variable and `emailError` state variable
  - Import `validateEmail` and `sanitizeEmail` from `../../utils`
  - Insert an `AppTextField` for email between the Name field and the Phone field (`autoComplete="email"`, `keyboardType="email-address"`, `leftIconName="mail-01"` or nearest available icon)
  - Wire `onChangeText` to use `sanitizeEmail` for sanitisation and `validateEmail` for inline error display
  - Update `canSubmit` to include `!email.trim()` and `validateEmail(email)` checks
  - Update `onSubmit` to validate email and set `emailError`
  - Extend `Props.onContinue` to `(data: { role: Role; fullName: string; email: string; phone: string }) => void`
  - Pass `email` in the `onContinue` call
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.1 Write unit tests for `SignUpScreen` email field
    - Test: email field is rendered between name and phone fields
    - Test: `onContinue` is called with `{ role, fullName, email, phone }` on valid submission
    - Test: "Continue" button is disabled when email is empty
    - Test: "Continue" button is disabled when email is invalid
    - _Requirements: 4.1, 4.5, 4.6_

  - [x] 7.2 Write property test — Property 7: Continue button disabled when any field invalid
    - Generate combinations of `role`, `fullName`, `email`, `phone` where at least one field fails validation
    - Assert the `canSubmit` logic returns `false` for all such combinations
    - **Property 7: Sign-up Continue button disabled unless all fields valid**
    - **Validates: Requirements 4.6**

- [x] 8. Update `RootNavigator` `SignUp` screen handler to forward email to `Otp`
  - Change `onContinue={({ phone }) => navigation.navigate('Otp', { phone })}` to `onContinue={({ phone, email }) => navigation.navigate('Otp', { phone, email })}`
  - _Requirements: 6.3, 6.4_

- [x] 9. Checkpoint — Ensure all tests pass
  - Run the full test suite and confirm zero failures
  - Verify TypeScript compilation reports no errors across all modified files
  - Ensure all tests pass; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Tasks 1–3 are pure logic / type changes with no visible UI impact; they are safe to land first
- Property tests (1.1–1.5, 7.2) require `fast-check`; install it if not already present (`npm install --save-dev fast-check`)
- The `OtpVerificationScreen` subtitle change (task 4) is backward-compatible: existing callers that pass only `phone` continue to work
- Property 6 (OTP subtitle contains the credential) is covered by the unit tests in task 4.1 rather than a separate property-based test, as it is more naturally expressed as concrete examples
