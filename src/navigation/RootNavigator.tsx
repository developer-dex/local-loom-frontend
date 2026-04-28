import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuth } from '../context/AuthContext';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Forward: `navigation.navigate('Screen')`. Back one step: `navigation.goBack()`. */

/** Default React Navigation `background` is light grey (`rgb(242,242,242)`); use app white. */
const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
  },
};

function OtpScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Otp'>) {
  const { login } = useAuth();
  return (
    <OtpVerificationScreen
      phone={route.params.phone}
      onBack={() => navigation.goBack()}
      onVerified={async () => {
        await login();
        /** Replace so Back from Home does not return to OTP. */
        navigation.replace('MainTabs');
      }}
      onResend={() => {
        // later: call resend API
      }}
    />
  );
}

export function RootNavigator() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName="Onboarding"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
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
                  onComplete={() => navigation.navigate('SignUp')}
                  onSkip={() => navigation.navigate('MainTabs')}
                />
              );
            }}
          />
          <Stack.Screen
            name="SignUp"
            component={function SignUp({ navigation }: NativeStackScreenProps<RootStackParamList, 'SignUp'>) {
              return (
                <SignUpScreen
                  onContinue={({ phone }) => navigation.navigate('Otp', { phone })}
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
                  onSendOtp={({ phone }) => navigation.navigate('Otp', { phone })}
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
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

