import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}
export default function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  const [disabled, setDisabled] = useState(false);
  const handleRetry = useCallback(() => {
    if (disabled) return;
    setDisabled(true);
    try {
      onRetry();
    } finally {
      setTimeout(() => setDisabled(false), 1000);
    }
  }, [disabled, onRetry]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>エラーが発生しました</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={handleRetry}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>最初からやり直す</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#cc0000",
    marginBottom: 40,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  message: {
    fontSize: 36,
    marginBottom: 40,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderWidth: 2,
    borderColor: "#000000",
    borderStyle: "solid",
    backgroundColor: "#ffffff",
  },
  buttonDisabled: {
    backgroundColor: "#cccccc",
  },
  buttonText: {
    fontSize: 36,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
});
