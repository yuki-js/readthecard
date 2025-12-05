import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
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
    getSelectedReaderId()
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
          }))
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
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>カードリーダー設定</Text>

        {loading && <Text style={styles.message}>読み込み中...</Text>}

        {error && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && devices.length === 0 && (
          <Text style={styles.message}>
            カードリーダーが見つかりません
          </Text>
        )}

        {!loading && !error && devices.length > 0 && (
          <View style={styles.deviceList}>
            {devices.map((device) => (
              <Pressable
                key={device.id}
                style={[
                  styles.deviceItem,
                  selectedId === device.id && styles.deviceItemSelected,
                ]}
                onPress={() => handleSelect(device.id)}
              >
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

        <View style={styles.buttonRow}>
          {selectedId && (
            <Pressable style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>選択解除</Text>
            </Pressable>
          )}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 24,
    minWidth: 400,
    maxWidth: "90%",
    maxHeight: "80%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  error: {
    fontSize: 16,
    color: "#cc0000",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  deviceList: {
    marginBottom: 20,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#cccccc",
    marginBottom: 8,
    borderRadius: 4,
  },
  deviceItemSelected: {
    borderColor: "#0066cc",
    backgroundColor: "#e6f0ff",
  },
  deviceName: {
    fontSize: 16,
    flex: 1,
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  deviceNameSelected: {
    fontWeight: "bold",
    color: "#0066cc",
  },
  checkMark: {
    fontSize: 18,
    color: "#0066cc",
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
    borderWidth: 1,
    borderColor: "#999999",
    borderRadius: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: "#666666",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#0066cc",
    borderRadius: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontFamily: '"MS ゴシック", "MS Gothic", monospace',
  },
});
