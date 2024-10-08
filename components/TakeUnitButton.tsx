import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, Image, Text } from "react-native";
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
import { AntDesign } from '@expo/vector-icons';

interface TakeUnitButtonProps {
  onPress: () => void;
  units: number;
  size?: number;
}

const TakeUnitButton: React.FC<TakeUnitButtonProps> = ({
  onPress,
  units,
}) => {
  const backgroundColor = useThemeColor("primary");
  const borderColor = useThemeColor("accent");
  const textColor = useThemeColor("base-content");
  const scale = useSharedValue(1);
  const progress = useSharedValue(0);
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown, setCountdown] = useState(15); 
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const startCountdown = useCallback(() => {
    setShowOverlay(true);
    setCountdown(15);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setShowOverlay(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handlePress = useCallback(() => {
    handleHapticFeedback();
    if (units > 0) {
      onPress();
      startCountdown();
    }
  }, [handleHapticFeedback, onPress, units, startCountdown]);

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
    .enabled(!showOverlay)
    .onBegin(() => {
      if (units > 0 && !showOverlay) {
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
      if (!showOverlay) {
        scale.value = withSpring(1);
        if (units > 0) {
          progress.value = withTiming(0, { duration: 200 });
          runOnJS(stopHapticFeedback)();
          if (event.duration >= duration) {
            runOnJS(playSound)(openSound);
            runOnJS(handlePress)();
          }
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: units > 0 ? 1 : 0.5,
    zIndex: 1000,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: showOverlay ? 0.95 : 0,
    display: showOverlay ? 'flex' : 'none',
  }));

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          {
            width: "48%",
            aspectRatio: 2 / 3,
            backgroundColor,
            borderColor,
          },
        ]}
      >
        <Image
          source={beerCanImage as ImageSourcePropType}
          style={styles.beerCanIcon}
        />
        <Text style={[styles.unitsText, { color: textColor }]}>{units} st</Text>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <AntDesign name="checkcircle" size={100} color="white" style={{  }} />
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.instructiveText}>VISA PHADDER</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 2,
    flex: 1,
  },
  beerCanIcon: {
    height: "85%",
    width: "110%",
    marginLeft: 13,
    resizeMode: "contain",
  },
  unitsText: {
    fontSize: 40,
    fontFamily: "Montserrat-Bold",
    fontWeight: "bold",
    marginTop: -15,
    marginBottom: 5,
    marginLeft: 9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'green',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  countdownText: {
    fontSize: 44,
    marginTop:10,
    color: 'white',
    fontWeight: 'bold',

  },
  instructiveText: {
    fontSize: 14,
    color: 'white',
    margin: 5,
    fontWeight: 'bold'
  },
});

export default TakeUnitButton;
