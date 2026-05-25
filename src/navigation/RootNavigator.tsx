import { useEffect, useState } from 'react';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '../theme';
import type { RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { OtpVerificationScreen, SignInScreen, SignUpScreen } from '../screens/auth';
import { OnboardingFlow } from '../screens/onboarding/OnboardingFlow';
import { ServiceDetailScreen } from '../screens/main/ServiceDetailScreen';
import { TermsAndConditionsScreen } from '../screens/profile/TermsAndConditionsScreen';
import { PrivacyPolicyScreen } from '../screens/profile/PrivacyPolicyScreen';
import { HelpSupportScreen } from '../screens/profile/HelpSupportScreen';
import { FaqScreen } from '../screens/profile/FaqScreen';
import { BecomeTradieScreen } from '../screens/profile/BecomeTradieScreen';
import { ManageTradiesScreen } from '../screens/profile/ManageTradiesScreen';
import { ChatDetailScreen } from '../screens/chat';
import { AiSearchScreen } from '../screens/ai';
import { getOnboardingSeen, setOnboardingSeen } from '../storage/onboardingStorage';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
  },
};

/**
 * Navigator-level auth guard for `ChatDetail`.
 *
 * Per Requirement 22.5: when a guest attempts to navigate to `ChatDetail`,
 * redirect to `SignIn` rather than rendering the conversation. Wrapping the
 * screen here keeps the guard independent of `ChatDetailScreen`'s contents,
 * so future revisions of that screen don't need to re-implement the check.
 *
 * `isReady` gates the redirect until `hydrateAuthThunk` resolves — without
 * this, a freshly launched app (tokens still in SecureStore, Redux still
 * empty) would incorrectly bounce a real user to SignIn.
 */
function ChatDetailGuarded(_props: NativeStackScreenProps<RootStackParamList, 'ChatDetail'>) {
  const navigation = _props.navigation;
  const { isReady, isLoggedIn } = useAuth();

  useEffect(() => {
    if (isReady && !isLoggedIn) {
      navigation.replace('SignIn');
    }
  }, [isReady, isLoggedIn, navigation]);

  // Render nothing while hydrating or while the redirect is in flight, so
  // a guest never briefly sees the chat UI.
  if (!isReady || !isLoggedIn) return null;

  return <ChatDetailScreen />;
}

function OtpScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Otp'>) {
  const { identifier, identifierType, displayIdentifier, signupRole } = route.params;
  return (
    <OtpVerificationScreen
      identifier={identifier}
      identifierType={identifierType}
      displayIdentifier={displayIdentifier}
      onBack={() => navigation.goBack()}
      onVerified={() => {
        if (signupRole === 'tradie') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'BecomeTradie', params: { mode: 'create', fromSignup: true } }],
          });
          return;
        }
        navigation.replace('MainTabs');
      }}
      onResend={() => {
        // TODO: call resend API
      }}
    />
  );
}

export function RootNavigator() {
  // null = still checking storage, false = show onboarding, true = skip it
  const [onboardingSeen, setOnboardingSeenState] = useState<boolean | null>(null);
  const { isReady, isLoggedIn } = useAuth();

  useEffect(() => {
    getOnboardingSeen().then((seen) => setOnboardingSeenState(seen));
  }, []);

  // Wait for both: onboarding flag read AND auth hydration complete.
  // This prevents any flash of the wrong screen.
  if (onboardingSeen === null || !isReady) return null;

  // If user is logged in (tokens + profile restored), go straight to MainTabs
  // regardless of onboarding state.
  const initialRoute: keyof RootStackParamList = isLoggedIn
    ? 'MainTabs'
    : onboardingSeen
      ? 'MainTabs'
      : 'Onboarding';

  const handleOnboardingComplete = async (navigate: () => void) => {
    await setOnboardingSeen();
    navigate();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          <Stack.Screen
            name="Onboarding"
            component={function OnboardingScreen({
              navigation,
            }: {
              navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
            }) {
              return (
                <OnboardingFlow
                  onComplete={() =>
                    handleOnboardingComplete(() => navigation.replace('MainTabs'))
                  }
                  onSkip={() =>
                    handleOnboardingComplete(() => navigation.replace('MainTabs'))
                  }
                />
              );
            }}
          />

          <Stack.Screen
            name="SignUp"
            component={function SignUp({ navigation }: NativeStackScreenProps<RootStackParamList, 'SignUp'>) {
              return (
                <SignUpScreen
                  onContinue={({ phone, role }) =>
                    navigation.navigate('Otp', {
                      identifier: phone,
                      identifierType: 'phone',
                      displayIdentifier: phone,
                      signupRole: role,
                    })
                  }
                  onBack={() =>
                    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SignIn')
                  }
                  onSignIn={() => navigation.navigate('SignIn')}
                  onSkipToHome={() => navigation.navigate('MainTabs')}
                />
              );
            }}
          />

          <Stack.Screen
            name="SignIn"
            component={function SignIn({ navigation }: NativeStackScreenProps<RootStackParamList, 'SignIn'>) {
              return (
                <SignInScreen
                  onBack={() => navigation.goBack()}
                  onSignUp={() => navigation.navigate('SignUp')}
                  onSendOtp={({ identifier, identifierType }) =>
                    navigation.navigate('Otp', { identifier, identifierType })
                  }
                />
              );
            }}
          />

          <Stack.Screen name="Otp" component={OtpScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
          <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="Faq" component={FaqScreen} />
          <Stack.Screen name="BecomeTradie" component={BecomeTradieScreen} />
          <Stack.Screen name="ManageTradies" component={ManageTradiesScreen} />
          <Stack.Screen name="ChatDetail" component={ChatDetailGuarded} />
          <Stack.Screen name="AiSearch" component={AiSearchScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
