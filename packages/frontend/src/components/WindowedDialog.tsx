import type { ReactNode } from "react";
import { useState, createContext, useContext } from "react";
import { View, Modal, StyleSheet, Pressable, Text } from "react-native";

const FONT = '"MS ゴシック", "MS Gothic", monospace';
const raised = {
  borderWidth: 2,
  borderTopColor: "#fff",
  borderLeftColor: "#fff",
  borderRightColor: "#777",
  borderBottomColor: "#777",
};
const pressed = {
  borderTopColor: "#222",
  borderLeftColor: "#222",
  borderRightColor: "#bbb",
  borderBottomColor: "#bbb",
  transform: [{ translateY: 1 }],
};

type Props = {
  onClose: () => void;
  title?: string;
  children?: ReactNode;
};

type WindowedDialogContextValue = {
  title: string;
  status: string;
  setTitle: (t: string) => void;
  setStatus: (s: string) => void;
  requestClose: () => void;
};

const WindowedDialogContext = createContext<WindowedDialogContextValue>({
  title: "ウィンドウ",
  status: "準備中",
  setTitle: () => {},
  setStatus: () => {},
  requestClose: () => {},
});

export function useWindowedDialog(): WindowedDialogContextValue {
  return useContext(WindowedDialogContext);
}

export default function WindowedDialog({ onClose, title = "ウィンドウ", children }: Props) {
  const [localTitle, setLocalTitle] = useState(title);
  const [status, setStatus] = useState("準備中");

  const ctx: WindowedDialogContextValue = {
    title: localTitle,
    status,
    setTitle: setLocalTitle,
    setStatus,
    requestClose: onClose,
  };

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.window, raised]}>
          <View style={styles.titleBar}>
            <Text style={styles.titleText}>{localTitle}</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed: p }) => [styles.closeBtn, raised, p && styles.closeBtnPressed]}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.hr} />

          <WindowedDialogContext.Provider value={ctx}>
            <View style={styles.body}>{children}</View>

            <View style={[styles.statusBar, raised]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </WindowedDialogContext.Provider>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  window: {
    flex: 1,
    backgroundColor: "#f0f0f0", // Windows 95風グレー
  },
  titleBar: {
    height: 32,
    backgroundColor: "#000080", // Win95風タイトルバー色
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  titleText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontFamily: FONT,
    fontSize: 14,
  },
  closeBtn: {
    width: 28,
    height: 22,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnPressed: {
    ...pressed,
  },
  closeText: {
    fontSize: 16,
    color: "#333333",
    fontFamily: FONT,
    lineHeight: 16,
  },
  hr: {
    height: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#fff",
    borderBottomColor: "#888",
  },
  body: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 8,
  },
  statusBar: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#e0e0e0",
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONT,
    color: "#333",
  },
});