import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { cardManager, type CardManagerState } from "../managers/CardManager";

interface WaitForCardProps {
  onCardReady: () => void;
  onError: (error: string) => void;
  status: CardManagerState["status"];
}

export default function WaitForCard({
  onCardReady,
  onError,
  status,
}: WaitForCardProps) {
  const [message, setMessage] = useState("初期化中...");

  // ステータスに応じたメッセージを更新
  useEffect(() => {
    switch (status) {
      case "idle":
      case "initializing":
        setMessage("初期化中...");
        break;
      case "waiting-device":
        setMessage("デバイス検索中...");
        break;
      case "waiting-card":
        setMessage("カードをかざしてください...");
        break;
      case "ready":
        setMessage("カード接続完了");
        break;
      case "error":
        setMessage("エラーが発生しました");
        break;
      default:
        setMessage("処理中...");
    }
  }, [status]);

  // 初期化とカード待機を実行
  useEffect(() => {
    let cancelled = false;

    const initAndWait = async () => {
      try {
        // プラットフォーム初期化
        await cardManager.initialize();

        if (cancelled) return;

        // カード待機
        await cardManager.waitForCardAndConnect(60000);

        if (cancelled) return;

        onCardReady();
      } catch (err) {
        if (!cancelled) {
          onError(String(err));
        }
      }
    };

    initAndWait();

    return () => {
      cancelled = true;
    };
  }, [onCardReady, onError]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>💳</Text>
      <Text style={styles.title}>マイナンバーカードを</Text>
      <Text style={styles.title}>リーダーにかざしてください</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  message: {
    fontSize: 36,
    marginTop: 40,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
});
