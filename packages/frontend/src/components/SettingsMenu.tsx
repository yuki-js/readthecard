import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { cardManager } from "../managers/CardManager";
import {
  getSelectedReaderId,
  setSelectedReaderId,
  getSelectedSpeakerId,
  setSelectedSpeakerId,
} from "../utils/settings";
import { speakText } from "../utils/voicevox";

interface DeviceInfo {
  id: string;
  friendlyName?: string;
}

interface VoiceStyle {
  name: string;
  id: number;
  order?: number;
}

interface VoiceModelMeta {
  name: string;
  styles: VoiceStyle[];
  speaker_uuid: string;
  version: string;
  order?: number;
}

interface SettingsMenuProps {
  onClose: () => void;
}

export default function SettingsMenu({ onClose }: SettingsMenuProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    getSelectedReaderId(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // VOICEVOX モデルメタ情報
  const [voiceMetas, setVoiceMetas] = useState<VoiceModelMeta[]>([]);
  // 選択された VOICEVOX スピーカー（スタイル）ID（永続化）
  const [selectedSpeakerId, setSelectedSpeakerIdState] = useState<number | undefined>(
    getSelectedSpeakerId(),
  );

  // キャラ/スタイルを「スロット風」で選択するためのインデックス
  const [charIndex, setCharIndex] = useState(0);
  const [styleIndex, setStyleIndex] = useState(0);

  // デバイス一覧読み込み
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true);
        setError(null);
        const deviceList = await cardManager.getAvailableDevices();
        setDevices(
          deviceList.map((d) => ({
            id: d.id,
            friendlyName: d.friendlyName,
          })),
        );
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, []);

  // VOICEVOX モデルメタ情報の読み込み
  useEffect(() => {
    let cancelled = false;
    const loadMetas = async () => {
      try {
        const res = await fetch("/api/voicevox/metas");
        if (!res.ok) return;
        const json = await res.json();
        const metas: VoiceModelMeta[] = Array.isArray(json) ? json : json?.metas || [];
        if (!cancelled) {
          setVoiceMetas(metas);
        }
      } catch {
        // ignore
      }
    };
    loadMetas();
    return () => {
      cancelled = true;
    };
  }, []);

  // 既存の選択からスロットの初期位置を決定
  useEffect(() => {
    if (voiceMetas.length === 0) return;
    const sid = selectedSpeakerId ?? 3; // デフォルト: ずんだもん ノーマル
    let ci = 0;
    let si = 0;
    for (let i = 0; i < voiceMetas.length; i++) {
      const sidx = voiceMetas[i].styles.findIndex((s) => s.id === sid);
      if (sidx !== -1) {
        ci = i;
        si = sidx;
        break;
      }
    }
    setCharIndex(ci);
    setStyleIndex(si);
  }, [voiceMetas, selectedSpeakerId]);

  // 選択中のキャラ/スタイル情報（ガード付き）
  const currentModel =
    voiceMetas.length > 0
      ? voiceMetas[(charIndex + voiceMetas.length) % voiceMetas.length]
      : undefined;
  const stylesForCurrent = currentModel?.styles ?? [];
  const normalizedStyleIndex =
    stylesForCurrent.length > 0
      ? (styleIndex + stylesForCurrent.length) % stylesForCurrent.length
      : 0;

  // スロット風ナビゲーション
  const prevChar = useCallback(() => {
    if (!voiceMetas.length) return;
    setCharIndex((i) => (i - 1 + voiceMetas.length) % voiceMetas.length);
    setStyleIndex(0);
  }, [voiceMetas.length]);

  const nextChar = useCallback(() => {
    if (!voiceMetas.length) return;
    setCharIndex((i) => (i + 1) % voiceMetas.length);
    setStyleIndex(0);
  }, [voiceMetas.length]);

  const prevStyle = useCallback(() => {
    if (!stylesForCurrent.length) return;
    setStyleIndex(
      (i) => (i - 1 + stylesForCurrent.length) % stylesForCurrent.length,
    );
  }, [stylesForCurrent.length]);

  const nextStyle = useCallback(() => {
    if (!stylesForCurrent.length) return;
    setStyleIndex((i) => (i + 1) % stylesForCurrent.length);
  }, [stylesForCurrent.length]);

  // スピーカー選択を確定（永続化）
  const applySelection = useCallback(() => {
    const sid = stylesForCurrent[normalizedStyleIndex]?.id;
    if (sid != null) {
      setSelectedSpeakerIdState(sid);
      setSelectedSpeakerId(sid);
    }
  }, [stylesForCurrent, normalizedStyleIndex]);

  // 試聴（適用してからテスト発話）
  const previewSelection = useCallback(async () => {
    applySelection();
    try {
      await speakText("これはテストなのだ！");
    } catch {
      // no-op
    }
  }, [applySelection]);

  // 現在のVOICEVOX表示ラベル（確定済み選択に基づく）
  const currentVoiceLabel = useMemo(() => {
    try {
      if (voiceMetas.length === 0) {
        return "VOICEVOX メタ情報未取得";
      }
      const sid = selectedSpeakerId ?? 3;
      for (const m of voiceMetas) {
        const style = m.styles.find((s) => s.id === sid);
        if (style) {
          return `VOICEVOX ${m.name} ${style.name} を使用しています`;
        }
      }
      return `VOICEVOX ずんだもん ノーマル を使用しています`;
    } catch {
      return "VOICEVOX 状態不明";
    }
  }, [voiceMetas, selectedSpeakerId]);

  // カードリーダー選択
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedReaderId(id);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedId(undefined);
    setSelectedReaderId(undefined);
  }, []);

  // スロット表示用の前後テキスト
  const prevCharName =
    voiceMetas.length > 0
      ? voiceMetas[(charIndex - 1 + voiceMetas.length) % voiceMetas.length]?.name
      : "";
  const currCharName = currentModel?.name ?? "";
  const nextCharName =
    voiceMetas.length > 0
      ? voiceMetas[(charIndex + 1) % voiceMetas.length]?.name
      : "";

  const prevStyleName =
    stylesForCurrent.length > 0
      ? stylesForCurrent[
          (normalizedStyleIndex - 1 + stylesForCurrent.length) %
            stylesForCurrent.length
        ]?.name
      : "";
  const currStyleName =
    stylesForCurrent[normalizedStyleIndex]?.name ??
    (stylesForCurrent[0]?.name ?? "");
  const nextStyleName =
    stylesForCurrent.length > 0
      ? stylesForCurrent[
          (normalizedStyleIndex + 1) % stylesForCurrent.length
        ]?.name
      : "";

  return (
    <Modal transparent={true} visible={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerOrnamentLeft} />
            <View style={styles.headerOrnamentRight} />
            <Text style={styles.title}>■ カードリーダー設定 ■</Text>
          </View>
          <View style={styles.hr} />
          <View style={styles.modalBody}>
            <View style={styles.contentFrame}>
              <Text style={styles.sectionTitle}>≡ 接続可能なデバイス ≡</Text>
              {loading && <Text style={styles.message}>読み込み中...</Text>}

              {error && <Text style={styles.error}>{error}</Text>}

              {!loading && !error && devices.length === 0 && (
                <Text style={styles.message}>カードリーダーが見つかりません</Text>
              )}

              {!loading && !error && devices.length > 0 && (
                <View style={styles.deviceList}>
                  {devices.map((device, index) => (
                    <Pressable
                      key={device.id}
                      style={({ pressed }) => [
                        styles.deviceItem,
                        index % 2 === 0
                          ? styles.deviceItemEven
                          : styles.deviceItemOdd,
                        selectedId === device.id && styles.deviceItemSelected,
                        pressed && styles.deviceItemPressed,
                      ]}
                      onPress={() => handleSelect(device.id)}
                    >
                      <View
                        style={[
                          styles.deviceIndicator,
                          selectedId === device.id &&
                            styles.deviceIndicatorSelected,
                        ]}
                      />
                      <Text
                        style={[
                          styles.deviceName,
                          selectedId === device.id && styles.deviceNameSelected,
                        ]}
                      >
                        {device.friendlyName || device.id}
                      </Text>
                      {selectedId === device.id && (
                        <Text style={styles.checkMark}>✓</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.hr} />
              <Text style={styles.sectionTitle}>≡ 読み上げモデル ≡</Text>

              {voiceMetas.length === 0 && (
                <Text style={styles.message}>モデル情報が取得できません</Text>
              )}

              {voiceMetas.length > 0 && (
                <>
                  <View style={styles.slotPanel}>
                    {/* キャラ側ホイール */}
                    <View style={styles.wheel}>
                      <Text style={styles.wheelTitle}>≪ キャラ ≫</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.arrowButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={prevChar}
                      >
                        <Text style={styles.wheelArrow}>▲</Text>
                      </Pressable>

                      <View style={styles.wheelWindow}>
                        <Text style={styles.wheelItemFaint}>{prevCharName}</Text>
                        <Text style={styles.wheelItemActive}>{currCharName}</Text>
                        <Text style={styles.wheelItemFaint}>{nextCharName}</Text>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.arrowButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={nextChar}
                      >
                        <Text style={styles.wheelArrow}>▼</Text>
                      </Pressable>
                    </View>

                    {/* スタイル側ホイール */}
                    <View style={styles.wheel}>
                      <Text style={styles.wheelTitle}>≪ スタイル ≫</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.arrowButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={prevStyle}
                      >
                        <Text style={styles.wheelArrow}>▲</Text>
                      </Pressable>

                      <View style={styles.wheelWindow}>
                        <Text style={styles.wheelItemFaint}>{prevStyleName}</Text>
                        <Text style={styles.wheelItemActive}>{currStyleName}</Text>
                        <Text style={styles.wheelItemFaint}>{nextStyleName}</Text>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.arrowButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={nextStyle}
                      >
                        <Text style={styles.wheelArrow}>▼</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.buttonRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.randButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => {
                        if (!voiceMetas.length) return;
                        const ci = Math.floor(Math.random() * voiceMetas.length);
                        const stylesLen = voiceMetas[ci]?.styles?.length || 1;
                        const si = Math.floor(Math.random() * stylesLen);
                        setCharIndex(ci);
                        setStyleIndex(si);
                      }}
                    >
                      <Text style={styles.randButtonText}>［RND］</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.applyButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={applySelection}
                    >
                      <Text style={styles.applyButtonText}>［適用］</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.previewButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={previewSelection}
                    >
                      <Text style={styles.previewButtonText}>［試聴］</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
          <View style={styles.modalFooter}>
            <View style={styles.hr} />
            <View style={styles.buttonRow}>
              {selectedId && (
                <Pressable
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleClear}
                >
                  <Text style={styles.clearButtonText}>［選択解除］</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>［閉じる］</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{currentVoiceLabel}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#f2f2f2",
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#666666",
    borderBottomColor: "#666666",
    overflow: "hidden",
    padding: 0,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  modalHeader: {
    backgroundColor: "#e6e6e6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  headerOrnamentLeft: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 6,
    height: 6,
    backgroundColor: "#cfcfcf",
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#666666",
    borderBottomColor: "#666666",
  },
  headerOrnamentRight: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 6,
    height: 6,
    backgroundColor: "#cfcfcf",
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#666666",
    borderBottomColor: "#666666",
  },
  modalBody: {
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  modalFooter: {
    backgroundColor: "#ececec",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "flex-end",
  },
  hr: {
    height: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#ffffff",
    borderBottomColor: "#888888",
    marginVertical: 8,
  },
  statusBar: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#e0e0e0",
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#666666",
    borderBottomColor: "#666666",
  },
  statusText: {
    fontSize: 12,
    color: "#111111",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    letterSpacing: 0.5,
  },
  contentFrame: {
    backgroundColor: "#ededed",
    padding: 12,
    borderWidth: 2,
    borderTopColor: "#666666",
    borderLeftColor: "#666666",
    borderRightColor: "#ffffff",
    borderBottomColor: "#ffffff",
    borderRadius: 2,
  },
  deviceIndicator: {
    width: 4,
    height: "100%",
    backgroundColor: "#d9d9d9",
    marginRight: 8,
  },
  deviceIndicatorSelected: {
    backgroundColor: "#f1f1f1",
  },
  deviceItemPressed: {
    backgroundColor: "#eeeeee",
    borderColor: "#999999",
  },
  buttonPressed: {
    borderTopColor: "#222222",
    borderLeftColor: "#222222",
    borderRightColor: "#bbbbbb",
    borderBottomColor: "#bbbbbb",
    transform: [{ translateY: 1 }],
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 0,
    textAlign: "center",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    color: "#111111",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#111111",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    color: "#333333",
  },
  error: {
    fontSize: 16,
    color: "#222222",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    fontStyle: "italic",
  },
  deviceList: {
    marginBottom: 16,
    backgroundColor: "#f7f7f7",
    borderWidth: 1,
    borderColor: "#bdbdbd",
    borderRadius: 2,
    padding: 8,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#bcbcbc",
    marginBottom: 8,
    borderRadius: 2,
    backgroundColor: "#ffffff",
  },
  deviceItemEven: {
    backgroundColor: "#f9f9f9",
  },
  deviceItemOdd: {
    backgroundColor: "#ffffff",
  },
  deviceItemSelected: {
    borderColor: "#111111",
    backgroundColor: "#333333",
  },
  deviceName: {
    fontSize: 16,
    flex: 1,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    letterSpacing: 0.25,
  },
  deviceNameSelected: {
    fontWeight: "bold",
    color: "#ffffff",
    textDecorationLine: "underline",
  },
  checkMark: {
    fontSize: 18,
    color: "#ffffff",
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#777777",
    borderBottomColor: "#777777",
    borderRadius: 2,
    backgroundColor: "#f4f4f4",
  },
  clearButtonText: {
    fontSize: 16,
    color: "#333333",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    letterSpacing: 0.5,
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#444444",
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: "#bbbbbb",
    borderLeftColor: "#bbbbbb",
    borderRightColor: "#222222",
    borderBottomColor: "#222222",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    letterSpacing: 0.5,
  },

  // ▼▼▼ ノスタルジック・スロット風 VOICEVOX セレクタ ▼▼▼
  slotPanel: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  wheel: {
    flex: 1,
    backgroundColor: "#e9e9e9",
    padding: 8,
    borderWidth: 2,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#777777",
    borderBottomColor: "#777777",
    borderRadius: 2,
  },
  wheelTitle: {
    fontSize: 12,
    textAlign: "center",
    color: "#111111",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  arrowButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    backgroundColor: "#dddddd",
    borderWidth: 2,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#888888",
    borderBottomColor: "#888888",
    borderRadius: 2,
    marginBottom: 6,
  },
  wheelArrow: {
    fontSize: 14,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    color: "#222222",
    letterSpacing: 1,
  },
  wheelWindow: {
    backgroundColor: "#f7f7f7",
    borderWidth: 2,
    borderTopColor: "#666666",
    borderLeftColor: "#666666",
    borderRightColor: "#ffffff",
    borderBottomColor: "#ffffff",
    borderRadius: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  wheelItemFaint: {
    fontSize: 12,
    color: "#777777",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    marginVertical: 2,
  },
  wheelItemActive: {
    fontSize: 16,
    color: "#111111",
    fontWeight: "bold",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderTopColor: "#bbbbbb",
    borderLeftColor: "#bbbbbb",
    borderRightColor: "#eeeeee",
    borderBottomColor: "#eeeeee",
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    marginVertical: 2,
  },
  applyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#444444",
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: "#bbbbbb",
    borderLeftColor: "#bbbbbb",
    borderRightColor: "#222222",
    borderBottomColor: "#222222",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    letterSpacing: 0.5,
  },
  previewButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#3b3b7a",
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: "#bbbbbb",
    borderLeftColor: "#bbbbbb",
    borderRightColor: "#222222",
    borderBottomColor: "#222222",
  },
  previewButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    letterSpacing: 0.5,
  },
  randButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#d0d0d0",
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#777777",
    borderBottomColor: "#777777",
  },
  randButtonText: {
    fontSize: 16,
    color: "#333333",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
    letterSpacing: 1,
  },
  // ▲▲▲ ノスタルジック・スロット風 VOICEVOX セレクタ ▲▲▲
});