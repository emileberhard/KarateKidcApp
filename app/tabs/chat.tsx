import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { cloudFunctions } from '../../firebaseConfig';

// Define the expected structure of the function result
interface ChatCompletionResult {
  data: {
    completion: string;
  };
}

export default function ChatScreen() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const result = await cloudFunctions.getCompletion({ prompt }) as ChatCompletionResult;
      setResponse(result.data.completion);
    } catch (error) {
      console.error('Error getting chat completion:', error);
      setResponse(`Error: ${error.message || 'Unable to get chat completion'}`);
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.title}>Chat Completion Test</ThemedText>
          <TextInput
            style={[styles.input, { color: 'white' }]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Enter your prompt here"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            multiline
          />
          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>Submit</ThemedText>
            )}
          </TouchableOpacity>
          <ThemedText style={styles.responseTitle}>Response:</ThemedText>
          <ThemedText style={styles.response}>{response}</ThemedText>
        </ThemedView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 100,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    padding: 10,
    textAlignVertical: 'top',
    color: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  response: {
    fontSize: 16,
  },
});
