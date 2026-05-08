# Requirements Document

## Introduction

This feature covers a set of authentication and navigation flow improvements for the LocalLoom React Native/Expo app. The changes affect the onboarding completion path, the sign-up form, the sign-in credential input, the OTP verification screen, and two existing navigation entry points that are already correct and are documented here for completeness.

## Glossary

- **OnboardingFlow**: The two-screen FlatList sequence shown to first-time users (`OnboardingWelcome` → `OnboardingConnect`).
- **OnboardingConnect**: The second onboarding screen containing the "Get Started" button.
- **RootNavigator**: The top-level React Navigation stack that owns all screen transitions.
- **MainTabs**: The bottom-tab navigator that serves as the authenticated (and guest) home experience.
- **SignUpScreen**: The account-creation screen with role picker, name, and phone fields.
- **SignInScreen**: The sign-in screen where a user provides a phone number or email address to receive an OTP.
- **OtpVerificationScreen**: The screen that accepts a 4-digit one-time password sent to the user's phone or email.
- **ServiceDetailScreen**: The screen showing details of a service provider, including a contact section with a login overlay.
- **ProfileScreen**: The tab screen shown when the user is not logged in, containing a "Sign in" button.
- **Credential**: A phone number or email address used to identify the user during sign-in.
- **OTP**: A 4-digit one-time password sent to the user's credential (phone or email).
- **Validator**: The module (`src/utils/validation.ts`) that exposes validation and sanitisation helpers.
- **Email_Regex**: The regular expression `^[^\s@]+@[^\s@]+\.[^\s@]+$` used to validate email addresses.

---

## Requirements

### Requirement 1: Onboarding "Get Started" Navigation

**User Story:** As a new user, I want the "Get Started" button on the final onboarding screen to take me directly to the home experience, so that I can browse LocalLoom without being forced into account creation.

#### Acceptance Criteria

1. WHEN the user presses "Get Started" on `OnboardingConnect`, THE `RootNavigator` SHALL navigate to `MainTabs`.
2. WHEN the user presses "Skip" on any onboarding screen, THE `RootNavigator` SHALL navigate to `MainTabs`.
3. THE `RootNavigator` SHALL NOT navigate to `SignUp` as a result of the `onComplete` callback from `OnboardingFlow`.

---

### Requirement 2: Service Detail Screen — Login Overlay Navigation (Existing, Confirmed)

**User Story:** As a guest user viewing a service detail, I want tapping the login overlay button to open the sign-in screen, so that I can authenticate without leaving the context I was in.

#### Acceptance Criteria

1. WHEN the user taps the "Login" button overlay on `ServiceDetailScreen`, THE `RootNavigator` SHALL navigate to `SignIn`.
2. WHEN the user completes sign-in from this entry point, THE `RootNavigator` SHALL return the user to the previous screen or `MainTabs`.

---

### Requirement 3: Profile Screen — Sign-In Button Navigation (Existing, Confirmed)

**User Story:** As a guest user on the Profile tab, I want tapping "Sign in" to open the sign-in screen, so that I can authenticate from the profile area.

#### Acceptance Criteria

1. WHEN the user taps "Sign in" on `ProfileScreen` while not logged in, THE `RootNavigator` SHALL navigate to `SignIn`.
2. WHEN the user completes sign-in from this entry point, THE `ProfileScreen` SHALL reflect the authenticated state.

---

### Requirement 4: Sign-Up Screen — Email Field

**User Story:** As a new user, I want to provide my email address during sign-up, so that the app can contact me and support email-based sign-in.

#### Acceptance Criteria

1. THE `SignUpScreen` SHALL display an email input field positioned after the Name field and before the Phone field.
2. WHEN the user submits the sign-up form, THE `Validator` SHALL reject an empty email field with the message "Email is required."
3. WHEN the user enters an email address that does not match `Email_Regex`, THE `Validator` SHALL return the error "Enter a valid email address."
4. WHEN the user enters a valid email address, THE `Validator` SHALL return no error for that field.
5. WHEN the user submits the sign-up form, THE `SignUpScreen` SHALL pass `email` as part of the `onContinue` callback data alongside `role`, `fullName`, and `phone`.
6. THE `SignUpScreen` SHALL disable the "Continue" button until `role`, `fullName`, `email`, and `phone` all pass validation.

---

### Requirement 5: Sign-In Screen — Phone or Email Credential Input

**User Story:** As a returning user, I want to sign in with either my phone number or my email address, so that I can use whichever credential I remember.

#### Acceptance Criteria

1. THE `SignInScreen` SHALL display a single text input field that accepts both phone numbers and email addresses.
2. WHEN the user's input begins with a digit (0–9), THE `SignInScreen` SHALL treat the input as a phone number and apply phone validation rules.
3. WHEN the user's input begins with a letter (a–z or A–Z), THE `SignInScreen` SHALL treat the input as an email address and apply email validation rules.
4. WHEN the user's input is empty, THE `SignInScreen` SHALL display the error "Phone number or email is required."
5. WHEN the credential is detected as a phone number and fails phone validation, THE `SignInScreen` SHALL display the phone-specific error message.
6. WHEN the credential is detected as an email address and fails email validation, THE `SignInScreen` SHALL display the error "Enter a valid email address."
7. WHEN the user submits a valid phone credential, THE `SignInScreen` SHALL invoke `onSendOtp` with `{ phone: string, email: undefined }`.
8. WHEN the user submits a valid email credential, THE `SignInScreen` SHALL invoke `onSendOtp` with `{ email: string, phone: undefined }`.
9. THE `SignInScreen` SHALL set `keyboardType` to `"email-address"` to support both input types on a single keyboard.

---

### Requirement 6: OTP Screen — Dynamic Subtitle

**User Story:** As a user waiting for an OTP, I want the verification screen to tell me exactly where the code was sent, so that I know which inbox or message thread to check.

#### Acceptance Criteria

1. WHEN `OtpVerificationScreen` receives a `phone` value and no `email` value, THE `OtpVerificationScreen` SHALL display the subtitle "OTP has been sent to {phone}."
2. WHEN `OtpVerificationScreen` receives an `email` value and no `phone` value, THE `OtpVerificationScreen` SHALL display the subtitle "OTP has been sent to {email}."
3. THE `RootStackParamList` `Otp` route params SHALL be updated to `{ phone?: string; email?: string }` so that either credential can be passed.
4. THE `RootNavigator` `OtpScreen` component SHALL read whichever of `phone` or `email` is present from `route.params` and pass it to `OtpVerificationScreen`.
5. IF neither `phone` nor `email` is present in `route.params`, THEN THE `OtpVerificationScreen` SHALL display the subtitle "OTP has been sent to your contact."

---

### Requirement 7: Credential Validation Utilities

**User Story:** As a developer, I want shared validation helpers for email addresses, so that validation logic is consistent across `SignUpScreen` and `SignInScreen`.

#### Acceptance Criteria

1. THE `Validator` SHALL export a `validateEmail(value: string): string | null` function that returns `null` for valid email addresses and an error string for invalid ones.
2. THE `Validator` SHALL export a `sanitizeEmail(input: string): { value: string; hadInvalid: boolean }` function that trims leading and trailing whitespace and lowercases the result.
3. WHEN `validateEmail` is called with an empty string, THE `Validator` SHALL return "Email is required."
4. WHEN `validateEmail` is called with a string that does not match `Email_Regex`, THE `Validator` SHALL return "Enter a valid email address."
5. WHEN `validateEmail` is called with a string that matches `Email_Regex`, THE `Validator` SHALL return `null`.
6. FOR ALL valid email strings `e`, `validateEmail(sanitizeEmail(e).value)` SHALL return `null` (round-trip property).
