import { View, Text, Pressable, StyleSheet } from 'react-native';

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>エラーが発生しました</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>最初からやり直す</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#cc0000',
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
    borderColor: '#000000',
    borderStyle: 'solid',
    backgroundColor: '#ffffff',
  },
  buttonText: {
    fontSize: 36,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
});
