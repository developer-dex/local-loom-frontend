import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@localloom/onboarding_seen';

export async function getOnboardingSeen(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'true';
}

export async function setOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}
