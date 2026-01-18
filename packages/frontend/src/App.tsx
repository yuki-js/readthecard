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
import {
  getPresetText,
  speakPresetGreeting,
  speakText,
} from "./utils/voicevox";
import SettingsMenu from "./components/SettingsMenu";
import { getTestCardMode } from "./utils/settings";
import { decode } from "@abasb75/openjpeg";
import type { Jpeg2000Decoded } from "@abasb75/openjpeg";
import WindowedDialog from "./components/WindowedDialog";
import MynaDump from "./components/MynaDump";
import PinRefresher from "./components/PinRefresher";

type AppState = "wait-card" | "pin-input" | "loading" | "result" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("wait-card");
  const [error, setError] = useState<string>("");
  const [basicFour, setBasicFour] = useState<BasicFourInfo | null>(null);
  const [kenkaku, setKenkaku] = useState<{
    faceUri?: string | null;
    faceError?: string | null;
    namePngUri?: string | null;
    addressPngUri?: string | null;
    securityPngUri?: string | null;
  }>({});
  const [remainingAttempts, setRemainingAttempts] = useState<
    number | undefined
  >(undefined);
  const [managerState, setManagerState] = useState<CardManagerState>(
    cardManager.state,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showDump, setShowDump] = useState(false);
  const [showPinRefresher, setShowPinRefresher] = useState(false);

  // CardManagerの状態変更を監視
  useEffect(() => {
    const unsubscribe = cardManager.addListener(setManagerState);
    return unsubscribe;
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

      const imgs = await cardManager.readKenkakuImages();
      const nextFaceUri = await jp2ToPngDataUrl(imgs.faceJp2);
      const nextNamePngUri = bytesToPngDataUrl(imgs.namePng);
      const nextAddressPngUri = bytesToPngDataUrl(imgs.addressPng);
      const nextSecurityPngUri = bytesToPngDataUrl(imgs.securityCodePng);

      setKenkaku({
        faceUri: nextFaceUri,
        namePngUri: nextNamePngUri,
        addressPngUri: nextAddressPngUri,
        securityPngUri: nextSecurityPngUri,
      });

      setBasicFour(basicFourData);
      setState("result");

      // 読み上げ
      await speakBasicFour(basicFourData);
    } catch (err) {
      setError(String(err));
      setState("error");
    }
  }, []);

  const handleCardReady = useCallback(() => {
    if (getTestCardMode()) {
      // テストカードモードならPIN入力をスキップして「1234」で固定
      setState("loading");
      setRemainingAttempts(undefined);
      handlePinSubmit("1234");
    } else {
      setState("pin-input");
    }
  }, []);

  const handleReset = useCallback(async () => {
    await cardManager.release();
    setBasicFour(null);
    setKenkaku({});
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

  const handleDumpOpen = useCallback(() => {
    setShowDump(true);
  }, []);

  const handleDumpClose = useCallback(() => {
    setShowDump(false);
  }, []);

  const handlePinRefresherOpen = useCallback(() => {
    setShowPinRefresher(true);
  }, []);

  const handlePinRefresherClose = useCallback(() => {
    setShowPinRefresher(false);
  }, []);

  return (
    <View style={styles.container}>
      {/* 左上の隠し設定ボタン */}
      <Pressable
        style={styles.hiddenSettingsButton}
        onPress={handleSettingsOpen}
      >
        <Text style={styles.hiddenSettingsText}>⚙</Text>
      </Pressable>

      {/* 右上のダンプボタン */}
      <Pressable style={styles.hiddenDumpButton} onPress={handleDumpOpen}>
        <Text style={styles.hiddenSettingsText}>🐈</Text>
      </Pressable>

      {/* 左下のPINリフレッシャー（隠し） */}
      <Pressable
        style={styles.hiddenPinRefresherButton}
        onPress={handlePinRefresherOpen}
      >
        <Text style={styles.hiddenSettingsText}>🔑</Text>
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
          <BasicFourDisplay
            data={basicFour}
            onBack={handleReset}
            kenkaku={kenkaku}
          />
        )}
        {state === "error" && (
          <ErrorDisplay message={error} onRetry={handleReset} />
        )}
      </View>

      {/* 設定メニュー（モーダル） */}
      {showSettings && <SettingsMenu onClose={handleSettingsClose} />}
      {/* ダンプ（モーダル） */}
      {showDump && (
        <WindowedDialog title="ダンプ" onClose={handleDumpClose}>
          <MynaDump />
        </WindowedDialog>
      )}
      {/* PIN リフレッシャー（モーダル） */}
      {showPinRefresher && (
        <WindowedDialog
          title="PIN リフレッシャー"
          onClose={handlePinRefresherClose}
        >
          <PinRefresher />
        </WindowedDialog>
      )}
    </View>
  );
}

async function speakBasicFour(data: BasicFourInfo) {
  const usedPreset = await speakPresetGreeting(data.name);
  if (!usedPreset) {
    const presetText = await getPresetText(data.name);

    // プリセットがなければVOICEVOXで生成
    const greeting = `${data.name}さん、こんにちわなのだ！`;
    await speakText(presetText || greeting);
  }
}
async function jp2ToPngDataUrl(faceJp2: Uint8Array): Promise<string> {
  const arrayBuffer = faceJp2.slice().buffer;
  const decoded: Jpeg2000Decoded = await decode(arrayBuffer);

  const width = decoded?.frameInfo?.width;
  const height = decoded?.frameInfo?.height;
  if (!width || !height) {
    throw new Error("OpenJPEG decode: invalid frameInfo");
  }

  const buf: Uint8Array =
    decoded.decodedBuffer instanceof Uint8Array
      ? decoded.decodedBuffer
      : decodeStringToBytes(decoded.decodedBuffer);

  const pixels = width * height;
  const comps = decoded?.frameInfo?.componentCount ?? 1;

  let rgbaClamped: Uint8ClampedArray;

  if (buf.length === pixels * 4) {
    // RGBA
    rgbaClamped = new Uint8ClampedArray(buf);
  } else if (buf.length === pixels * 3) {
    // RGB -> RGBA
    const out = new Uint8ClampedArray(pixels * 4);
    for (let i = 0, j = 0, k = 0; i < pixels; i++, j += 3, k += 4) {
      out[k] = buf[j];
      out[k + 1] = buf[j + 1];
      out[k + 2] = buf[j + 2];
      out[k + 3] = 255;
    }
    rgbaClamped = out;
  } else if (comps === 1 && buf.length === pixels) {
    // Grayscale -> RGBA
    const out = new Uint8ClampedArray(pixels * 4);
    for (let i = 0; i < pixels; i++) {
      const v = buf[i];
      const k = i * 4;
      out[k] = v;
      out[k + 1] = v;
      out[k + 2] = v;
      out[k + 3] = 255;
    }
    rgbaClamped = out;
  } else if (buf.length === pixels) {
    // Fallback: assume grayscale
    const out = new Uint8ClampedArray(pixels * 4);
    for (let i = 0; i < pixels; i++) {
      const v = buf[i];
      const k = i * 4;
      out[k] = v;
      out[k + 1] = v;
      out[k + 2] = v;
      out[k + 3] = 255;
    }
    rgbaClamped = out;
  } else {
    throw new Error(
      `Unexpected decodedBuffer size=${buf.length}, width=${width}, height=${height}, comps=${comps}`,
    );
  }

  if (typeof document === "undefined") {
    throw new Error("Document not available");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D が利用できません");

  const imgData = ctx.createImageData(width, height);
  imgData.data.set(rgbaClamped);
  ctx.putImageData(imgData, 0, 0);

  return canvas.toDataURL("image/png");
}

function decodeStringToBytes(s: string): Uint8Array {
  // Try base64 (optionally data URL)
  const base64 = s.startsWith("data:") ? s.split(",")[1] : s;
  try {
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    // Try hex
    const isHex = /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0;
    if (isHex) {
      const len = s.length / 2;
      const out = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
      }
      return out;
    }
    throw new Error("Unsupported decodedBuffer string format");
  }
}

function bytesToPngDataUrl(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return "data:image/png;base64," + btoa(binary);
}

async function trimPngDataUrl(uri: string): Promise<string> {
  // 周囲余白をより堅牢にトリミング（背景色推定＋輝度しきい値）
  return new Promise<string>((resolve) => {
    if (typeof document === "undefined") return resolve(uri);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(uri);

      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, w, h);

      const bright = (r: number, g: number, b: number) =>
        (r * 299 + g * 587 + b * 114) / 1000;

      // 背景の推定: 四隅＋周囲をサンプル
      const samples: number[] = [];
      const stepX = Math.max(1, Math.floor(w / 20));
      const stepY = Math.max(1, Math.floor(h / 20));
      const sampleAt = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        samples.push(bright(data[i], data[i + 1], data[i + 2]));
      };
      for (let x = 0; x < w; x += stepX) {
        sampleAt(x, 0);
        sampleAt(x, h - 1);
      }
      for (let y = 0; y < h; y += stepY) {
        sampleAt(0, y);
        sampleAt(w - 1, y);
      }
      const avgBg =
        samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
      // 背景に近い（高輝度）ピクセルを余白とみなす（角の平均より少し広めに許容）
      const thr = Math.min(252, Math.max(238, avgBg + 6));

      let minX = w,
        minY = h,
        maxX = -1,
        maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const a = data[i + 3];
          if (a < 8) continue; // 透明は余白
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
          const L = bright(r, g, b);
          if (L >= thr) continue; // 背景相当は余白
          // コンテンツ
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }

      if (maxX < 0 || maxY < 0) return resolve(uri); // 何も見つからなければ元を返す

      // 少しマージンを残してクロップ
      const margin = 2;
      const sx = Math.max(0, minX - margin);
      const sy = Math.max(0, minY - margin);
      const sw = Math.min(w - sx, maxX - minX + 1 + margin * 2);
      const sh = Math.min(h - sy, maxY - minY + 1 + margin * 2);

      const out = document.createElement("canvas");
      out.width = sw;
      out.height = sh;
      const octx = out.getContext("2d");
      if (!octx) return resolve(uri);
      octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(out.toDataURL("image/png"));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

async function scalePngDataUrl(uri: string, targetH: number): Promise<string> {
  // トリミング済みPNGを指定高さで拡大（アスペクト比維持、ボケ防止）
  return new Promise<string>((resolve) => {
    if (typeof document === "undefined") return resolve(uri);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const scale = targetH / Math.max(1, h);
      const outW = Math.round(w * scale);
      const outH = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(uri);

      // Crisp scaling
      ctx.imageSmoothingEnabled = false;
      // @ts-ignore
      ctx.mozImageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, outW, outH);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
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
  hiddenDumpButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    opacity: 0.3,
  },
  hiddenPinRefresherButton: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    opacity: 0.2,
  },
});
