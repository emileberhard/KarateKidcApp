import React, { useCallback, useRef } from "react";
import { StyleSheet, Image } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { ImageSourcePropType } from "react-native";
import beerCanImage from "@/assets/images/beer_can.png";
import crackSound from "@/assets/sounds/crack.wav";
import openSound from "@/assets/sounds/open.wav";

interface TakeUnitButtonProps {
  onPress: () => void;
  units: number;
  width: number;
}

const TakeUnitButton: React.FC<TakeUnitButtonProps> = ({
  onPress,
  units,
  width,
}) => {
  const scale = useSharedValue(1);
  const progress = useSharedValue(0);
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playSound = useCallback(async (sound: number) => {
    try {
      const { sound: audioSound } = await Audio.Sound.createAsync(sound);
      await audioSound.playAsync();
      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          audioSound.unloadAsync();
        }
      });
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  }, []);

  const handleHapticFeedback = useCallback(() => {
    if (units > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [units]);

  const handlePress = useCallback(() => {
    handleHapticFeedback();
    if (units > 0) {
      onPress();
    }
  }, [handleHapticFeedback, onPress, units]);

  const startHapticFeedback = useCallback(() => {
    if (units === 0) return;
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
    }, 100);
  }, [progress, units]);

  const stopHapticFeedback = useCallback(() => {
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
  }, []);

  const longPressGesture = Gesture.LongPress()
    .minDuration(1000)
    .onBegin(() => {
      if (units > 0) {
        scale.value = withSpring(0.95);
        progress.value = withTiming(1, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
        });
        runOnJS(startHapticFeedback)();
        runOnJS(playSound)(crackSound);
      } else {
        runOnJS(handleHapticFeedback)();
      }
    })
    .onFinalize((event) => {
      scale.value = withSpring(1);
      if (units > 0) {
        progress.value = withTiming(0, { duration: 200 });
        runOnJS(stopHapticFeedback)();
        if (event.duration >= 1000) {
          runOnJS(playSound)(openSound);
          runOnJS(handlePress)();
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor:
      units > 0
        ? interpolateColor(progress.value, [0, 1], ["#ff00bb", "#ffffff"])
        : "#808080",
  }));

  const textColorStyle = useAnimatedStyle(() => ({
    color:
      units > 0
        ? interpolateColor(progress.value, [0, 1], ["#ffffff", "#ff00bb"])
        : "#ffffff",
  }));

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View style={[styles.combinedButton, animatedStyle, { width }]}>
        <Animated.View style={styles.textContainer}>
          <Animated.Text style={[styles.takeUnitText, textColorStyle]}>
            Ta en enhet
          </Animated.Text>
          <Animated.Text style={[styles.unitsText, textColorStyle]}>
            Kvar: {units}st
          </Animated.Text>
        </Animated.View>
        <Image
          source={beerCanImage as ImageSourcePropType}
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
    borderColor: "#ffffff",
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 100,
    overflow: "hidden",
  },
  textContainer: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 20,
  },
  takeUnitText: {
    fontSize: 40,
    fontWeight: "bold",
  },
  unitsText: {
    fontSize: 24,
    fontWeight: "bold",
    paddingLeft: 4,
  },
  beerCanIcon: {
    width: 90,
    height: 80,
    marginRight: 10,
  },
});

export default TakeUnitButton;
