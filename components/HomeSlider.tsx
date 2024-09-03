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
import { AntDesign } from '@expo/vector-icons';
import CuteNinja from "../assets/images/cute_ninja.png";
import NinjaHouse from "@/assets/images/ninja_house.png";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Text } from "react-native";
import { theme } from "@/theme";

interface SlideButtonProps {
  onSlideComplete: () => void;
  text: string;
  isActive: boolean;
}

const SlideButton: React.FC<SlideButtonProps> = ({
  onSlideComplete,
  text,
  isActive,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SLIDER_WIDTH = SCREEN_WIDTH * 0.2;
  const SLIDE_THRESHOLD = SCREEN_WIDTH * 0.75;

  const accentColor = useThemeColor("accent");

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!isActive) {
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      translateX.value = withTiming(SCREEN_WIDTH - SLIDER_WIDTH, {
        duration: 300,
      });
    }
  }, [isActive, SCREEN_WIDTH, SLIDER_WIDTH]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onChange((event) => {
      if (!isActive) {
        let newValue = event.translationX;
        newValue = Math.max(0, Math.min(newValue, SCREEN_WIDTH - SLIDER_WIDTH));
        translateX.value = newValue;
      }
    })
    .onFinalize(() => {
      if (!isActive && translateX.value >= SLIDE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH - SLIDER_WIDTH, {
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
    opacity: interpolate(translateX.value, [0, SCREEN_WIDTH / 2], [1, 0]),
  }));

  const houseOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SCREEN_WIDTH / 2], [1, 0]),
  }));

  const backgroundColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      translateX.value,
      [0, SCREEN_WIDTH - SLIDER_WIDTH],
      ["#ff8c00", "#4caf50"]
    ),
  }));

  const sliderOpacityStyle = useAnimatedStyle(() => ({
    opacity: isActive ? 0 : 1,
  }));

  const sliderBackgroundTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SCREEN_WIDTH / 2, SCREEN_WIDTH - SLIDER_WIDTH],
      [0, 1, 1]
    ),
  }));

  const arrowOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SCREEN_WIDTH / 4], [1, 0]),
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        backgroundColorStyle,
        { borderColor: accentColor },
      ]}
    >
      <Animated.Text style={[styles.text, textOpacityStyle, { fontFamily: theme.fonts.regular }]}>
        {isActive ? "Hemkomst bekräftad" : text}
      </Animated.Text>
      <Animated.View
        style={[styles.sliderBackground, sliderBackgroundTextStyle]}
      >
        <Text style={[styles.sliderBackgroundText, { fontFamily: theme.fonts.bold }]}>HEMMA ✅</Text>
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.slider,
            animatedStyle,
            sliderOpacityStyle,
            { width: SLIDER_WIDTH, borderColor: accentColor },
          ]}
        >
          <Image
            source={CuteNinja as ImageSourcePropType}
            style={styles.icon}
            resizeMode="contain"
          />
          <Animated.View style={[styles.arrowContainer, arrowOpacityStyle]}>
            <AntDesign name="arrowright" size={27} color={accentColor} />
          </Animated.View>
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
    marginVertical: 10,
    borderRadius: 15,
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
    backgroundColor: "#FF5BB8",
    borderRadius: 15,
    flexDirection: "row",
    borderWidth: 2,
  },
  text: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontSize: 18,
    color: "#ffffff",
  },
  icon: {
    width: "45%",
    height: "100%",
    marginRight: 25,
  },
  arrow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "5%",
  },
  arrowLine: {
    width: "20%",
    height: 2,
    backgroundColor: "#FFFFFF",
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
    color: "#ffffff",
  },
  sliderText: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "bold",
    color: "#ff8c00",
    right: 10,
  },
  arrowContainer: {
    position: 'absolute',
    right: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SlideButton;
