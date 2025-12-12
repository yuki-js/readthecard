import { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

interface PinInputProps {
  onSubmit: (pin: string) => void | Promise<void>;
  remainingAttempts?: number;
}

export default function PinInput({
  onSubmit,
  remainingAttempts,
}: PinInputProps) {
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((value: string) => {
    const filtered = value.replace(/[^0-9]/g, "").slice(0, 4);
    setPin(filtered);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length === 4 && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const maybePromise = onSubmit(pin);
        // Support both synchronous and async handlers
        if (
          maybePromise &&
          typeof (maybePromise as any).then === "function"
        ) {
          await (maybePromise as Promise<void>);
        }
      } finally {
        setIsSubmitting(false);
        setPin("");
      }
    }
  }, [pin, isSubmitting, onSubmit]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>暗証番号を入力してください</Text>
      <Text style={styles.subtitle}>（券面事項入力補助用暗証番号: 4桁）</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={handleChange}
          onSubmitEditing={handleSubmit}
          maxLength={4}
          autoFocus
          keyboardType="numeric"
          secureTextEntry
        />
      </View>
      <Pressable
        style={[
          styles.button,
          (pin.length !== 4 || isSubmitting) && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={pin.length !== 4 || isSubmitting}
      >
        <Text style={styles.buttonText}>確認</Text>
      </Pressable>
      {remainingAttempts !== undefined && (
        <Text style={styles.error}>
          暗証番号が正しくありません。残り{remainingAttempts}回
        </Text>
      )}
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
    marginBottom: 40,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  subtitle: {
    fontSize: 24,
    marginBottom: 20,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  inputContainer: {
    marginBottom: 40,
  },
  input: {
    fontSize: 72,
    textAlign: "center",
    width: 400,
    height: 100,
    borderWidth: 3,
    borderColor: "#000000",
    borderStyle: "solid",
    letterSpacing: 20,
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
  error: {
    color: "#cc0000",
    fontSize: 24,
    marginTop: 20,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
});
