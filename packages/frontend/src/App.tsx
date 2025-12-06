import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  cardManager,
  type BasicFourInfo,
  type CardManagerState,
} from "./managers/CardManager";
import PinInput from "./components/PinInput";
import WaitForCard from "./components/WaitForCard";
import BasicFourDisplay from "./components/BasicFourDisplay";
import ErrorDisplay from "./components/ErrorDisplay";
import SettingsMenu from "./components/SettingsMenu";
import { speakText } from "./utils/voicevox";

type AppState = "wait-card" | "pin-input" | "loading" | "result" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("wait-card");
  const [error, setError] = useState<string>("");
  const [basicFour, setBasicFour] = useState<BasicFourInfo | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<
    number | undefined
  >(undefined);
  const [managerState, setManagerState] = useState<CardManagerState>(
    cardManager.state,
  );
  const [showSettings, setShowSettings] = useState(false);

  // CardManagerの状態変更を監視
  useEffect(() => {
    const unsubscribe = cardManager.addListener(setManagerState);
    return unsubscribe;
  }, []);

  const handleCardReady = useCallback(() => {
    setState("pin-input");
  }, []);

  const handlePinSubmit = useCallback(async (pin: string) => {
    setState("loading");
    setRemainingAttempts(undefined);

    try {
      // PIN検証
      const verifyResult = await cardManager.verifyPin(pin);
      if (!verifyResult.verified) {
        if (verifyResult.remainingAttempts !== undefined) {
          setRemainingAttempts(verifyResult.remainingAttempts);
        }
        setState("pin-input");
        return;
      }

      // 基本4情報読み取り
      const basicFourData = await cardManager.readBasicFour();

      setBasicFour(basicFourData);
      setState("result");

      // 読み上げ
      await speakBasicFour(basicFourData);
    } catch (err) {
      setError(String(err));
      setState("error");
    }
  }, []);

  const handleReset = useCallback(async () => {
    await cardManager.release();
    setBasicFour(null);
    setError("");
    setRemainingAttempts(undefined);
    setState("wait-card");
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setState("error");
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setShowSettings(false);
  }, []);

  return (
    <View style={styles.container}>
      {/* 左上の隠し設定ボタン */}
      <Pressable style={styles.hiddenSettingsButton} onPress={handleSettingsOpen}>
        <Text style={styles.hiddenSettingsText}>⚙</Text>
      </Pressable>

      <View style={styles.content}>
        {state === "wait-card" && (
          <WaitForCard
            onCardReady={handleCardReady}
            onError={handleError}
            status={managerState.status}
          />
        )}
        {state === "pin-input" && (
          <PinInput
            onSubmit={handlePinSubmit}
            remainingAttempts={remainingAttempts}
          />
        )}
        {state === "loading" && (
          <Text style={styles.loading}>読み込み中...</Text>
        )}
        {state === "result" && basicFour && (
          <BasicFourDisplay data={basicFour} onBack={handleReset} />
        )}
        {state === "error" && (
          <ErrorDisplay message={error} onRetry={handleReset} />
        )}
      </View>

      {/* 設定メニュー（モーダル） */}
      {showSettings && <SettingsMenu onClose={handleSettingsClose} />}
    </View>
  );
}

async function speakBasicFour(data: BasicFourInfo) {
  const text = `お名前は${data.name}さん。住所は${data.address}。生年月日は${data.birth}。性別は${data.gender}です。`;
  await speakText(text);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loading: {
    fontSize: 36,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  hiddenSettingsButton: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    opacity: 0.3,
  },
  hiddenSettingsText: {
    fontSize: 24,
    color: "#999999",
  },
});
