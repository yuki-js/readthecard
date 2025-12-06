import { View, Text, Pressable, StyleSheet } from "react-native";
import { useEffect } from "react";
import type { BasicFourInfo } from "../managers/CardManager";
import { speakText, speakPresetGreeting } from "../utils/voicevox";

interface BasicFourDisplayProps {
  data: BasicFourInfo;
  onBack: () => void;
}

export default function BasicFourDisplay({
  data,
  onBack,
}: BasicFourDisplayProps) {
  return (
    <View style={styles.container}>
      {/* 大きく氏名を表示（red big center bold） */}
      <Text style={styles.bigName}>{data.name}</Text>

      <Text style={styles.title}>基本4情報</Text>
      <View style={styles.item}>
        <Text style={styles.label}>氏名:</Text>
        <Text style={styles.value}>{data.name}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>住所:</Text>
        <Text style={styles.value}>{data.address}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>生年月日:</Text>
        <Text style={styles.value}>{data.birth}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>性別:</Text>
        <Text style={styles.value}>{data.gender}</Text>
      </View>
      <Pressable style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>戻る</Text>
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
  bigName: {
    fontSize: 96,
    fontWeight: "bold",
    color: "#FF0000",
    textAlign: "center",
    marginBottom: 40,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 40,
    borderBottomWidth: 3,
    borderBottomColor: "#000000",
    paddingBottom: 20,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: "100%",
    maxWidth: 800,
  },
  label: {
    fontSize: 48,
    fontWeight: "bold",
    width: 200,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  value: {
    fontSize: 48,
    flex: 1,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderWidth: 2,
    borderColor: "#000000",
    borderStyle: "solid",
    backgroundColor: "#ffffff",
    marginTop: 40,
  },
  buttonText: {
    fontSize: 36,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
});
