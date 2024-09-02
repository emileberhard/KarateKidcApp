import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface PhoneNumberPromptProps {
  isVisible: boolean;
  onSubmit: (phoneNumber: string) => void;
  isAdmin: boolean;
}

const PhoneNumberPrompt: React.FC<PhoneNumberPromptProps> = ({ isVisible, onSubmit, isAdmin }) => {
  const [phoneNumber, setPhoneNumber] = useState('');

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ThemedView style={styles.promptContainer}>
          <ThemedText style={styles.title}>Ange ditt telefonnummer</ThemedText>
          <ThemedText style={styles.subtitle}>
            {isAdmin
              ? "Behövs för att nollor enkelt ska kunna kontakta dig när du är nykter- eller ansvarigphadder."
              : "För att vi lätt ska kunna kontakta dig i nödfall."}
          </ThemedText>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Telefonnummer"
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => onSubmit(phoneNumber)}
          >
            <ThemedText style={styles.submitButtonText}>Skicka</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
  },
  promptContainer: {
    backgroundColor: '#460038',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffb4e4',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffb4e4',
  },
  input: {
    backgroundColor: 'white',
    width: '100%',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#ffb4e4',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#460038',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default PhoneNumberPrompt;