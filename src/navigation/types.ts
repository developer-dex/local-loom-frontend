import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MainTabParamList } from './mainTabTypes';
import type { TradieApplicationDraft } from '../storage/tradieApplication';
import type { IdentifierType, UserRole } from '../api/authTypes';

export type RootStackParamList = {
  Onboarding: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Otp: {
    identifier: string;
    identifierType: IdentifierType;
    /** Masked or display-friendly version shown in the subtitle. */
    displayIdentifier?: string;
    /** Set when arriving from sign-up — used to route tradies to profile setup after verify. */
    signupRole?: UserRole;
  };
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AiSearch: undefined;
  ServiceDetail: { providerId: string };
  TermsAndConditions: undefined;
  PrivacyPolicy: undefined;
  HelpSupport: undefined;
  Faq: undefined;
  BecomeTradie:
    | undefined
    | {
        mode?: 'create' | 'edit';
        initial?: TradieApplicationDraft;
        /** After sign-up OTP — complete steps then land on home. */
        fromSignup?: boolean;
      };
  ManageTradies: undefined;
  ChatDetail: { chatId: string; name: string; avatarUri?: string };
};

