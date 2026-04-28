import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CategoryScreen, ServiceListScreen } from '../screens/category';
import { colors } from '../theme';
import type { CategoryStackParamList } from './categoryTypes';

const Stack = createNativeStackNavigator<CategoryStackParamList>();

export function CategoryStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="CategoryHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="CategoryHome" component={CategoryScreen} />
      <Stack.Screen name="ServiceList" component={ServiceListScreen} />
    </Stack.Navigator>
  );
}
