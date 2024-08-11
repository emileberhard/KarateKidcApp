import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated, Image } from 'react-native';
import { ThemedText } from './ThemedText';

interface SlideButtonProps {
  onSlideComplete: () => void;
  text: string;
}

const SlideButton: React.FC<SlideButtonProps> = ({ onSlideComplete, text }) => {
  const [slideAnimation] = useState(new Animated.Value(0));
  const slidingActive = useRef(false);
  const startX = useRef(0);

  // Add interpolated values for background color and house opacity
  const backgroundColorInterpolation = slideAnimation.interpolate({
    inputRange: [0, 250],
    outputRange: ['#ff8c00', '#4caf50'],
  });

  const houseOpacityInterpolation = slideAnimation.interpolate({
    inputRange: [0, 250],
    outputRange: [1, 0],
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => slidingActive.current,
    onPanResponderGrant: (evt) => {
      slidingActive.current = true;
      startX.current = evt.nativeEvent.locationX;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (slidingActive.current) {
        const newValue = Math.max(0, Math.min(gestureState.dx, 250));
        slideAnimation.setValue(newValue);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      slidingActive.current = false;
      if (gestureState.dx >= 200) {
        Animated.timing(slideAnimation, {
          toValue: 250,
          duration: 100,
          useNativeDriver: false,
        }).start(onSlideComplete);
      } else {
        Animated.spring(slideAnimation, {
          toValue: 0,
          friction: 5,
          useNativeDriver: false,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      slidingActive.current = false;
      Animated.spring(slideAnimation, {
        toValue: 0,
        friction: 5,
        useNativeDriver: false,
      }).start();
    },
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: backgroundColorInterpolation }]}>
      <ThemedText style={styles.text}>{text}</ThemedText>
      <Animated.View
        style={[styles.slider, { transform: [{ translateX: slideAnimation }] }]}
        {...panResponder.panHandlers}
      >
        <Image
          source={require('@/assets/images/cute_ninja.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <View style={styles.arrow}>
          <View style={styles.arrowLine} />
          <View style={styles.arrowHead} />
        </View>
      </Animated.View>
      <Animated.Image
        source={require('@/assets/images/ninja_house.png')}
        style={[styles.houseIcon, { opacity: houseOpacityInterpolation }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
    height: 60,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slider: {
    position: 'absolute',
    left: 0,
    width: 86,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffd7f4',
    borderRadius: 16,
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
    fontSize: 13,
    paddingLeft: 30,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  icon: {
    width: 30,
    height: 50,
  },
  arrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
  arrowLine: {
    width: 20,
    height: 2,
    backgroundColor: '#ff8c00',
  },
  arrowHead: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ff8c00',
  },
  houseIcon: {
    position: 'absolute',
    right: 10,
    width: 40,
    height: 40,
  },
});

export default SlideButton;