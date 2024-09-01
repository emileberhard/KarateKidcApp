import { useState, useCallback } from 'react';
import { LayoutChangeEvent, TextLayoutEventData, NativeSyntheticEvent } from 'react-native';

export const useAutoSizeText = (maxFontSize: number, minFontSize: number, step: number = 1) => {
  const [fontSize, setFontSize] = useState(maxFontSize);
  const [containerWidth, setContainerWidth] = useState(0);

  const onTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (containerWidth === 0) return;
    
    const textWidth = e.nativeEvent.lines[0]?.width || 0;
    if (textWidth > containerWidth && fontSize > minFontSize) {
      setFontSize(Math.max(fontSize - step, minFontSize));
    } else if (textWidth < containerWidth * 0.9 && fontSize < maxFontSize) {
      setFontSize(Math.min(fontSize + step, maxFontSize));
    }
  }, [containerWidth, fontSize, maxFontSize, minFontSize, step]);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  return { fontSize, onTextLayout, onContainerLayout };
};