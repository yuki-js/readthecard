import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import React, { useState, useCallback } from "react";
import type { BasicFourInfo } from "../managers/CardManager";
interface KenkakuAssets {
  faceUri?: string | null;
  faceError?: string | null;
  namePngUri?: string | null;
  addressPngUri?: string | null;
  securityPngUri?: string | null;
}
interface BasicFourDisplayProps {
  data: BasicFourInfo;
  onBack: () => void;
  kenkaku?: KenkakuAssets;
}
export default function BasicFourDisplay({
  data,
  onBack,
  kenkaku,
}: BasicFourDisplayProps) {
  const [isBackDisabled, setBackDisabled] = useState(false);
  const handleBackPress = useCallback(() => {
    if (isBackDisabled) return;
    setBackDisabled(true);
    try {
      onBack();
    } finally {
      setTimeout(() => setBackDisabled(false), 1000);
    }
  }, [isBackDisabled, onBack]);
  return (
    <View style={styles.container}>
      {/* 大きく氏名を表示（red big center bold） */}
      <Text style={styles.bigName}>{data.name}</Text>

      <View style={styles.mainContent}>
        <View style={styles.photoWrapper}>
          <View style={styles.photoBox}>
            {kenkaku?.faceUri ? (
              <Image
                style={styles.photo}
                source={{ uri: kenkaku.faceUri }}
                resizeMode="cover"
              />
            ) : kenkaku?.faceError ? (
              <Text>{kenkaku.faceError}</Text>
            ) : (
              <Text>写真未取得</Text>
            )}
          </View>
        </View>

        <View style={styles.details}>
          <Text style={styles.title}>基本4情報</Text>
          <DefinitionListItem label="氏名:">
            {[
              <Text key="name" style={styles.value}>
                {data.name}
              </Text>,
              kenkaku?.namePngUri ? (
                <Image
                  key="namepng"
                  style={styles.imageFill}
                  source={{ uri: kenkaku.namePngUri }}
                  resizeMode="contain"
                />
              ) : (
                <Text key="namepng-missing" style={styles.value}>
                  未取得
                </Text>
              ),
            ]}
          </DefinitionListItem>
          <DefinitionListItem label="住所:">
            {[
              <Text key="address" style={styles.value}>
                {data.address}
              </Text>,
              kenkaku?.addressPngUri ? (
                <Image
                  key="addresspng"
                  style={styles.imageFill}
                  source={{ uri: kenkaku.addressPngUri }}
                  resizeMode="contain"
                />
              ) : (
                <Text key="addresspng-missing" style={styles.value}>
                  未取得
                </Text>
              ),
            ]}
          </DefinitionListItem>
          <DefinitionListItem
            label="生年月日:"
            labels={["生年月日:", "セキュリティコード:"]}
          >
            {[
              <Text key="birth" style={styles.value}>
                {data.birth}
              </Text>,
              kenkaku?.securityPngUri ? (
                <Image
                  key="security"
                  style={styles.imageFill}
                  source={{ uri: kenkaku.securityPngUri }}
                  resizeMode="contain"
                />
              ) : (
                <Text key="security-missing" style={styles.value}>
                  未取得
                </Text>
              ),
            ]}
          </DefinitionListItem>
          <DefinitionListItem label="性別:">
            {[
              <Text key="gender" style={styles.value}>
                {data.gender}
              </Text>,
            ]}
          </DefinitionListItem>
        </View>
      </View>

      <Pressable
        style={[styles.button, isBackDisabled && styles.buttonDisabled]}
        onPress={handleBackPress}
        disabled={isBackDisabled}
      >
        <Text style={styles.buttonText}>戻る</Text>
      </Pressable>
    </View>
  );
}

function DefinitionListItem({
  label,
  labels,
  children,
}: {
  label: string;
  labels?: string[];
  /**
   * This field must be immutable!
   */
  children: Array<React.ReactNode>;
}) {
  const [clickCount, setClickCount] = useState(0);
  const idx = children.length > 0 ? clickCount % children.length : 0;
  const current = children[idx];
  const displayLabel =
    labels && labels.length > 0 ? labels[idx % labels.length] : label;

  return (
    <View style={styles.item}>
      <Text style={styles.label}>{displayLabel}</Text>
      <Pressable
        style={{ flex: 1 }}
        onPress={() => setClickCount((c) => c + 1)}
      >
        {typeof current === "string" || typeof current === "number" ? (
          <Text style={styles.value}>{current}</Text>
        ) : (
          <View style={{ flex: 1 }}>{current}</View>
        )}
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
  imageFill: {
    height: 60,
    flexShrink: 0,
    width: 800,
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
  buttonDisabled: {
    backgroundColor: "#cccccc",
  },
  buttonText: {
    fontSize: 36,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
});
