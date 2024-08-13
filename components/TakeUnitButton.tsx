import React, { useCallback, useRef } from "react";
import { StyleSheet, Image, Text, ViewStyle } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
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
  size?: number;
}

const TakeUnitButton: React.FC<TakeUnitButtonProps> = ({
  onPress,
  units,
  size = 100,
}) => {
  const backgroundColor = useThemeColor("primary");
  const borderColor = useThemeColor("accent");
  const textColor = useThemeColor("base-content");
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

  const duration = 250;
  const longPressGesture = Gesture.LongPress()
    .minDuration(duration)
    .onBegin(() => {
      if (units > 0) {
        scale.value = withSpring(0.95);
        progress.value = withTiming(1, {
          duration,
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
        if (event.duration >= duration) {
          runOnJS(playSound)(openSound);
          runOnJS(handlePress)();
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: units > 0 ? 1 : 0.5,
  }));

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          {
            width: size / 1.5,
            height: size,
            backgroundColor,
            borderColor,
          },
        ]}
      >
        <Image
          source={beerCanImage as ImageSourcePropType}
          style={styles.beerCanIcon}
        />
        <Text style={[styles.unitsText, { color: textColor }]}>{units}st</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  beerCanIcon: {
    height: "75%",
    marginLeft: 9,
    resizeMode: "contain",
  },
  unitsText: {
    fontSize: 40,
    fontFamily: "Montserrat-Bold",
    fontWeight: "bold",
    marginTop: 5,
  },
});

export default TakeUnitButton;
