import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useDebugSettings = () => {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const loadDebugMode = async () => {
      try {
        const value = await AsyncStorage.getItem('debugMode');
        setDebugMode(value === 'true');
      } catch (error) {
        console.error('Error loading debug mode:', error);
      }
    };

    loadDebugMode();
  }, []);

  const toggleDebugMode = async () => {
    try {
      const newDebugMode = !debugMode;
      await AsyncStorage.setItem('debugMode', newDebugMode.toString());
      setDebugMode(newDebugMode);
    } catch (error) {
      console.error('Error toggling debug mode:', error);
    }
  };

  return { debugMode, toggleDebugMode };
};