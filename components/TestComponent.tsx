import React from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Entypo } from "@expo/vector-icons";
import { Dimensions } from "react-native";
import {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";

const SliderButton = () => {
  const END_POSITION = Dimensions.get("screen").width - 90;
  const onLeft = useSharedValue(true);
  const position = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      if (onLeft.value) {
        position.value = e.translationX;
      } else {
        position.value = END_POSITION + e.translationX;
      }
    })
    .onEnd(() => {
      if (position.value > END_POSITION / 1.5) {
        position.value = withTiming(END_POSITION, { duration: 100 });
        onLeft.value = false;
      } else {
        position.value = withTiming(0, { duration: 100 });
        onLeft.value = true;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));

  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderText}>Swipe To Raise The Alert</Text>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.swipeBtn, animatedStyle]}>
          <Entypo name="chevron-thin-right" size={24} color="#E64040" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SliderButton;

const styles = StyleSheet.create({
  sliderContainer: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#E64040",
    position: "relative",
    height: 50,
    overflow: "hidden",
    borderRadius: 15,
  },
  sliderText: {
    color: "#fff",
    fontSize: 18,
  },
  swipeBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#fff",
    position: "absolute",
    left: 5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
  },
});
