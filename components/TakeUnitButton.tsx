import React, { useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { ThemedText } from './ThemedText';

interface TakeUnitButtonProps {
  onPress: () => void;
  units: number;
  width: number;
}

const TakeUnitButton: React.FC<TakeUnitButtonProps> = ({ onPress, units, width }) => {
  const scale = useSharedValue(1);
  const progress = useSharedValue(0);
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [crackSound, setCrackSound] = React.useState<Audio.Sound | null>(null);
  const [openSound, setOpenSound] = React.useState<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSounds = async () => {
      const { sound: crackSoundObject } = await Audio.Sound.createAsync(
        require('@/assets/sounds/crack.wav')
      );
      const { sound: openSoundObject } = await Audio.Sound.createAsync(
        require('@/assets/sounds/open.wav')
      );
      setCrackSound(crackSoundObject);
      setOpenSound(openSoundObject);
    };

    loadSounds();

    return () => {
      if (crackSound) crackSound.unloadAsync();
      if (openSound) openSound.unloadAsync();
    };
  }, []);

  const handleHapticFeedback = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handlePress = useCallback(() => {
    handleHapticFeedback();
    onPress();
  }, [handleHapticFeedback, onPress]);

  const playCrackSound = useCallback(async () => {
    if (crackSound) {
      await crackSound.replayAsync();
    }
  }, [crackSound]);

  const playOpenSound = useCallback(async () => {
    if (openSound) {
      await openSound.replayAsync();
    }
  }, [openSound]);

  const startHapticFeedback = useCallback(() => {
    let intensity = 0;
    hapticIntervalRef.current = setInterval(() => {
      if (progress.value >= 1) {
        stopHapticFeedback();
        return;
      }
      if (intensity < 2) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (intensity < 4) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      intensity++;
    }, 100); // Reduced from 150ms to 100ms
  }, [progress]);

  const stopHapticFeedback = useCallback(() => {
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
  }, []);

  const longPressGesture = Gesture.LongPress()
    .minDuration(1000)
    .onBegin(() => {
      scale.value = withSpring(0.95);
      progress.value = withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) });
      runOnJS(startHapticFeedback)();
      runOnJS(playCrackSound)();
    })
    .onFinalize((event) => {
      scale.value = withSpring(1);
      progress.value = withTiming(0, { duration: 200 });
      runOnJS(stopHapticFeedback)();
      if (event.duration >= 1000) {
        runOnJS(playOpenSound)();
        runOnJS(handlePress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['#ff00bb', '#ffffff']
    ),
  }));

  const textColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      ['#ffffff', '#ff00bb']
    ),
  }));

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View style={[styles.combinedButton, animatedStyle, { width }]}>
        <Animated.View style={styles.textContainer}>
          <Animated.Text style={[styles.takeUnitText, textColorStyle]}>Ta en enhet</Animated.Text>
          <Animated.Text style={[styles.unitsText, textColorStyle]}>Kvar: {units}st</Animated.Text>
        </Animated.View>
        <Image
          source={require('@/assets/images/beer_can.png')}
          style={styles.beerCanIcon}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  combinedButton: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 100,
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  takeUnitText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  unitsText: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingLeft: 4,
  },
  beerCanIcon: {
    width: 90,
    height: 80,
    marginRight: 10,
  },
});

export default TakeUnitButton;