import React from "react";
import { View, StyleSheet, Image, useWindowDimensions } from "react-native";
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

interface SlideButtonProps {
  onSlideComplete: () => void;
  text: string;
  width?: number;
}

const SlideButton: React.FC<SlideButtonProps> = ({
  onSlideComplete,
  text,
  width,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const BUTTON_WIDTH = width || SCREEN_WIDTH * 0.9; // Use provided width or default to 90% of screen width
  const SLIDER_WIDTH = BUTTON_WIDTH * 0.25; // 25% of button width
  const SLIDE_THRESHOLD = BUTTON_WIDTH * 0.75; // 75% of button width

  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onChange((event) => {
      let newValue = event.translationX;
      newValue = Math.max(0, Math.min(newValue, BUTTON_WIDTH - SLIDER_WIDTH));
      translateX.value = newValue;
    })
    .onFinalize(() => {
      if (translateX.value >= SLIDE_THRESHOLD) {
        translateX.value = withTiming(BUTTON_WIDTH - SLIDER_WIDTH, {
          duration: 100,
        });
        runOnJS(onSlideComplete)();
      } else {
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

  return (
    <Animated.View
      style={[styles.container, backgroundColorStyle, { width: BUTTON_WIDTH }]}
    >
      <Animated.Text style={[styles.text, textOpacityStyle]}>
        {text}
      </Animated.Text>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.slider, animatedStyle, { width: SLIDER_WIDTH }]}
        >
          <Image
            source={CuteNinja as ImageSourcePropType}
            style={styles.icon}
            resizeMode="contain"
          />
          <View style={styles.arrow}>
            <View style={styles.arrowLine} />
            <View style={styles.arrowHead} />
          </View>
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
    borderColor: "#ffffff",
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
});

export default SlideButton;
