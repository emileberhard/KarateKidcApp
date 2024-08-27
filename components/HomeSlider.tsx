import React, { useEffect } from "react";
import { StyleSheet, Image, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { ImageSourcePropType } from "react-native";
import CuteNinja from "../assets/images/cute_ninja.png";
import NinjaHouse from "@/assets/images/ninja_house.png";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Text } from "react-native";

interface SlideButtonProps {
  onSlideComplete: () => void;
  text: string;
  width?: number;
  isActive: boolean;
}

const SlideButton: React.FC<SlideButtonProps> = ({
  onSlideComplete,
  text,
  width,
  isActive,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const BUTTON_WIDTH = width || SCREEN_WIDTH * 0.9;
  const SLIDER_WIDTH = BUTTON_WIDTH * 0.25;
  const SLIDE_THRESHOLD = BUTTON_WIDTH * 0.75;

  const accentColor = useThemeColor("accent");

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!isActive) {
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      translateX.value = withTiming(BUTTON_WIDTH - SLIDER_WIDTH, {
        duration: 300,
      });
    }
  }, [isActive, BUTTON_WIDTH, SLIDER_WIDTH]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onChange((event) => {
      if (!isActive) {
        let newValue = event.translationX;
        newValue = Math.max(0, Math.min(newValue, BUTTON_WIDTH - SLIDER_WIDTH));
        translateX.value = newValue;
      }
    })
    .onFinalize(() => {
      if (!isActive && translateX.value >= SLIDE_THRESHOLD) {
        translateX.value = withTiming(BUTTON_WIDTH - SLIDER_WIDTH, {
          duration: 100,
        });
        runOnJS(onSlideComplete)();
      } else if (!isActive) {
        translateX.value = withTiming(0, { duration: 100 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const textOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, BUTTON_WIDTH / 2], [1, 0]),
  }));

  const houseOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, BUTTON_WIDTH / 2], [1, 0]),
  }));

  const backgroundColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      translateX.value,
      [0, BUTTON_WIDTH - SLIDER_WIDTH],
      ["#ff8c00", "#4caf50"]
    ),
  }));

  const sliderOpacityStyle = useAnimatedStyle(() => ({
    opacity: isActive ? 0 : 1,
  }));

  const sliderBackgroundTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, BUTTON_WIDTH / 2, BUTTON_WIDTH - SLIDER_WIDTH],
      [0, 1, 1]
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        backgroundColorStyle,
        { width: BUTTON_WIDTH, borderColor: accentColor },
      ]}
    >
      <Animated.Text style={[styles.text, textOpacityStyle]}>
        {isActive ? "Hemkomst bekräftad" : text}
      </Animated.Text>
      <Animated.View
        style={[styles.sliderBackground, sliderBackgroundTextStyle]}
      >
        <Text style={styles.sliderBackgroundText}>HEMMA ✅</Text>
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.slider,
            animatedStyle,
            sliderOpacityStyle,
            { width: SLIDER_WIDTH },
          ]}
        >
          <Image
            source={CuteNinja as ImageSourcePropType}
            style={styles.icon}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
      <Animated.View style={[styles.houseIconContainer, houseOpacityStyle]}>
        <Image
          source={NinjaHouse as ImageSourcePropType}
          style={styles.houseIcon}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 2,
    height: 60,
    justifyContent: "center",
    overflow: "hidden",
  },
  slider: {
    position: "absolute",
    left: 0,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffd7f4",
    borderRadius: 16,
    flexDirection: "row",
  },
  text: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff",
  },
  icon: {
    width: "35%",
    height: "80%",
  },
  arrow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "5%",
  },
  arrowLine: {
    width: "20%",
    height: 2,
    backgroundColor: "#ff8c00",
  },
  arrowHead: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#ff8c00",
  },
  houseIconContainer: {
    position: "absolute",
    right: "3%",
    width: "12%",
    aspectRatio: 1,
  },
  houseIcon: {
    width: "100%",
    height: "100%",
  },
  sliderBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  sliderBackgroundText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  sliderText: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "bold",
    color: "#ff8c00",
    right: 10,
  },
});

export default SlideButton;
