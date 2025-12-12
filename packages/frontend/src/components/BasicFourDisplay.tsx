import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import type { BasicFourInfo } from "../managers/CardManager";

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

      <View style={styles.mainContent}>
        <View style={styles.photoWrapper}>
          <View style={styles.photoBox}>
            <Image
              style={styles.photo}
              // docs\openjpegjs.md にある方法で顔写真を表示してください
              source={{ uri: "https://invalid.example.com/face.jpg" }}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.details}>
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
        </View>
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
  mainContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  photoWrapper: {
    width: 300,
    marginRight: 40,
    alignItems: "center",
  },
  photoBox: {
    width: 300,
    height: 400,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#eeeeee",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  details: {
    flex: 1,
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
