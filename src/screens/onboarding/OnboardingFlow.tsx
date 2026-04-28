import { useCallback, useRef } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { OnboardingConnect } from './OnboardingConnect';
import { OnboardingWelcome } from './OnboardingWelcome';

type Props = {
  onComplete: () => void;
  onSkip?: () => void;
};

export function OnboardingFlow({ onComplete, onSkip }: Props) {
  const listRef = useRef<FlatList>(null);
  const width = Dimensions.get('window').width;

  const goNext = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: width, animated: true });
  }, [width]);

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={[0, 1]}
        horizontal
        pagingEnabled
        keyboardShouldPersistTaps="handled"
        keyExtractor={(i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width }}>
            {item === 0 ? (
              <OnboardingWelcome width={width} onNext={goNext} />
            ) : (
              <OnboardingConnect width={width} onGetStarted={onComplete} onSkip={onSkip ?? onComplete} />
            )}
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
