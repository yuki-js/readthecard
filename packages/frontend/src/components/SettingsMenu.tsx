import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { cardManager } from "../managers/CardManager";
import { getSelectedReaderId, setSelectedReaderId } from "../utils/settings";

interface DeviceInfo {
  id: string;
  friendlyName?: string;
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

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedReaderId(id);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedId(undefined);
    setSelectedReaderId(undefined);
  }, []);

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
                <Text style={styles.message}>
                  カードリーダーが見つかりません
                </Text>
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
    marginBottom: 8,
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
});
