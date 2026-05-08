import type { TradieApplicationDraft } from '../storage/tradieApplication';
import type { IdentifierType } from '../api/authTypes';

export type RootStackParamList = {
  Onboarding: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Otp: {
    identifier: string;
    identifierType: IdentifierType;
    /** Masked or display-friendly version shown in the subtitle. */
    displayIdentifier?: string;
  };
  MainTabs: undefined;
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
      };
  ManageTradies: undefined;
  ChatDetail: { chatId: string; name: string; avatarUri?: string };
};

