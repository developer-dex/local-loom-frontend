import type { TradieApplicationDraft } from '../storage/tradieApplication';

export type RootStackParamList = {
  Onboarding: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Otp: { phone: string };
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

