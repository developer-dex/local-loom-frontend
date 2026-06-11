import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/ui';
import { colors, fontFamilies, spacing } from '../theme';
import { CategoryStackNavigator } from './CategoryStack';
import type { MainTabParamList } from './mainTabTypes';
import { HomeScreen } from '../screens/main';
import { ProfileScreen } from '../screens/profile';
import { ChatsScreen } from '../screens/chat';

const Tab = createBottomTabNavigator<MainTabParamList>();

function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const animIndex = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.timing(animIndex, {
      toValue: state.index,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [animIndex, state.index]);

  const routeMeta = useMemo(() => {
    return state.routes.map((r) => {
      const label = r.name;
      const iconName =
        r.name === 'Home'
          ? 'home-09'
          : r.name === 'Chat'
            ? 'bubble-chat'
            : r.name === 'Category'
              ? 'dashboard-square-02'
              : 'user-03';
      return { key: r.key, name: r.name, label, iconName } as const;
    });
  }, [state.routes]);

  const count = state.routes.length;
  const gap = 12;
  const circle = 50;
  const horizontal = 14; // padding inside the pill (tabBarShadow.padding)
  const totalGap = gap * (count - 1);
  // Compute the active width dynamically: available space minus inactive circles minus gaps
  const inner = Math.max(0, barWidth - horizontal * 2);
  const activeW = Math.max(circle, inner - (count - 1) * circle - totalGap);

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View
        style={styles.tabBarShadow}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.tabBarInner}>
          {routeMeta.map((m, i) => {
            const focused = state.index === i;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: state.routes[i].key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(state.routes[i].name);
            };
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: state.routes[i].key });

            const inputRange = [i - 1, i, i + 1];
            const width = animIndex.interpolate({
              inputRange,
              outputRange: [circle, activeW, circle],
              extrapolate: 'clamp',
            });

            const iconBg = focused ? colors.primary : 'rgba(0,0,0,0.04)';
            const iconColor = focused ? colors.onPrimary : colors.placeholder;
            const labelColor = focused ? colors.onboardingTitle : 'transparent';

            return (
              <Animated.View key={m.key} style={[styles.itemWrap, { width }]}>
                <Pressable
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.itemPressable}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                    <Icon name={m.iconName} width={24} height={24}  color={iconColor}/>
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={[styles.itemLabel, { color: labelColor }]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        /** Fills the strip behind the floating pill so it isn’t the default grey. */
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Category" component={CategoryStackNavigator} />
      <Tab.Screen name="Chat" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  tabBarShadow: {
    backgroundColor: colors.background,
    borderRadius: 999,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  itemWrap: {
    height: 50,
    borderRadius: 999,
    overflow: 'hidden',
  },
  itemPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 999,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 16,
    flexShrink: 1,
  },
});

