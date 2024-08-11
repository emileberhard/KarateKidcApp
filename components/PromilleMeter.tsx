import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';

interface PromilleMeterProps {
  promille: number;
  width: number;
}

const PromilleMeter: React.FC<PromilleMeterProps> = ({ promille, width }) => {
  const getColor = (value: number) => {
    if (value < 0.6) return '#4CAF50'; // Green
    if (value < 1.0) return '#FFC107'; // Yellow
    if (value < 2.0) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getFillWidth = () => {
    const percentage = Math.min(promille / 3, 1);
    return width * percentage;
  };

  const getEmoji = (value: number) => {
    if (value < 0.6) return '😊'; // Slightly tipsy
    if (value < 1.0) return '🥳'; // Party mood
    if (value < 2.0) return '🥴'; // Dizzy
    return '🤢'; // Sick
  };

  const color = getColor(promille);
  const emoji = getEmoji(promille);

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.meterBackground}>
        <View style={[styles.meterFill, { width: getFillWidth(), backgroundColor: color }]} />
        <View style={styles.meterContent}>
          <ThemedText style={styles.promilleText}>
            {promille.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.emojiContainer}>
          <ThemedText style={styles.smallEmoji}>😊</ThemedText>
          <ThemedText style={styles.smallEmoji}>🥳</ThemedText>
          <ThemedText style={styles.smallEmoji}>🥴</ThemedText>
          <ThemedText style={styles.smallEmoji}>🤢</ThemedText>
        </View>
      </View>
      {promille >= 2.0 && (
        <ThemedText style={styles.warningText}>
          Varning: Hög promillenivå!
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  meterBackground: {
    width: '100%',
    height: 50, // Increased height to accommodate emojis
    backgroundColor: '#E0E0E0',
    borderRadius: 25, // Increased border radius
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 25, // Increased border radius
    justifyContent: 'center',
  },
  meterContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promilleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emoji: {
    fontSize: 24,
  },
  emojiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  smallEmoji: {
    fontSize: 18,
  },
  warningText: {
    marginTop: 5,
    color: '#F44336',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default PromilleMeter;