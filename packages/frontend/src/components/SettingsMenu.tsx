import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { cardManager } from "../managers/CardManager";
import {
  getSelectedReaderId,
  setSelectedReaderId,
  getSelectedSpeakerId,
  setSelectedSpeakerId,
} from "../utils/settings";
import { speakText } from "../utils/voicevox";

const FONT = '"MS ゴシック", "MS Gothic", monospace';
const mod = (n: number, m: number) => ((n % m) + m) % m;
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

interface Device {
  id: string;
  friendlyName?: string;
}
interface Style {
  name: string;
  id: number;
}
interface VoiceMeta {
  name: string;
  styles: Style[];
}

const Btn = ({
  onPress,
  children,
}: {
  onPress: () => void;
  children: string;
}) => (
  <Pressable
    style={({ pressed: p }) => [s.btn, raised, p && pressed]}
    onPress={onPress}
  >
    <Text>{children}</Text>
  </Pressable>
);

const Wheel = ({
  title,
  items,
  index,
  onUp,
  onDown,
}: {
  title: string;
  items: string[];
  index: number;
  onUp: () => void;
  onDown: () => void;
}) => (
  <View style={s.wheel}>
    <Text style={s.txt}>{title}</Text>
    <Btn onPress={onUp}>▲</Btn>
    <View style={s.window}>
      <Text style={s.fade}>{items[mod(index - 1, items.length)] || ""}</Text>
      <Text style={s.active}>{items[index] || ""}</Text>
      <Text style={s.fade}>{items[mod(index + 1, items.length)] || ""}</Text>
    </View>
    <Btn onPress={onDown}>▼</Btn>
  </View>
);

export default function SettingsMenu({ onClose }: { onClose: () => void }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState(getSelectedReaderId());
  const [loading, setLoading] = useState(true);
  const [voiceMetas, setVoiceMetas] = useState<VoiceMeta[]>([]);
  const [speakerId, setSpeakerId] = useState(getSelectedSpeakerId());
  const [charIdx, setCharIdx] = useState(0);
  const [styleIdx, setStyleIdx] = useState(0);

  const selectReader = (id: string | undefined) => {
    setSelectedId(id);
    setSelectedReaderId(id);
  };
  const selectSpeaker = (id: number) => {
    setSpeakerId(id);
    setSelectedSpeakerId(id);
  };
  const navigate = (delta: number, isChar: boolean) => {
    if (isChar) {
      setCharIdx(mod(charIdx + delta, voiceMetas.length));
      setStyleIdx(0);
    } else setStyleIdx(mod(styleIdx + delta, styles.length));
  };

  useEffect(() => {
    (async () => {
      try {
        const devs = await cardManager.getAvailableDevices();
        setDevices(
          devs.map((d) => ({ id: d.id, friendlyName: d.friendlyName })),
        );
      } finally {
        setLoading(false);
      }
    })();
    (async () => {
      try {
        const res = await fetch("/api/voicevox/metas");
        if (res.ok) {
          const json = await res.json();
          const metas = Array.isArray(json) ? json : json?.metas || [];
          setVoiceMetas(metas);
          const sid = speakerId ?? 3;
          for (let i = 0; i < metas.length; i++) {
            const sidx = metas[i].styles.findIndex((s: Style) => s.id === sid);
            if (sidx !== -1) {
              setCharIdx(i);
              setStyleIdx(sidx);
              break;
            }
          }
        }
      } catch {}
    })();
  }, []);

  const char = voiceMetas[charIdx];
  const styles = char?.styles || [];
  const si = mod(styleIdx, styles.length || 1);
  const apply = () => {
    const sid = styles[si]?.id;
    if (sid != null) selectSpeaker(sid);
  };
  const voiceLabel = (() => {
    if (!voiceMetas.length) return "メタ未取得";
    const sid = speakerId ?? 3;
    for (const m of voiceMetas) {
      const st = m.styles.find((s) => s.id === sid);
      if (st) return `${m.name} ${st.name}`;
    }
    return "ずんだもん ノーマル";
  })();

  return (
    <Modal transparent visible animationType="fade">
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.header}>
            <Text style={s.title}>■ 設定 ■</Text>
          </View>
          <View style={s.hr} />
          <View style={s.body}>
            <Text style={s.txt}>≡ デバイス ≡</Text>
            {loading ? (
              <Text style={s.txt}>読込中...</Text>
            ) : devices.length === 0 ? (
              <Text style={s.txt}>見つかりません</Text>
            ) : (
              <View style={s.list}>
                {devices.map((d) => {
                  const sel = selectedId === d.id;
                  return (
                    <Pressable
                      key={d.id}
                      style={[s.item, sel && s.itemSel]}
                      onPress={() => selectReader(d.id)}
                    >
                      <Text
                        style={[
                          s.txt,
                          { flex: 1 },
                          sel && { color: "#fff", fontWeight: "bold" },
                        ]}
                      >
                        {d.friendlyName || d.id}
                      </Text>
                      {sel && <Text style={s.check}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={s.hr} />
            <Text style={s.txt}>≡ 音声 ≡</Text>
            {voiceMetas.length > 0 && (
              <>
                <View
                  style={{ flexDirection: "row", gap: 8, marginVertical: 8 }}
                >
                  <Wheel
                    title="キャラ"
                    items={voiceMetas.map((m) => m.name)}
                    index={charIdx}
                    onUp={() => navigate(-1, true)}
                    onDown={() => navigate(1, true)}
                  />
                  <Wheel
                    title="スタイル"
                    items={styles.map((s) => s.name)}
                    index={si}
                    onUp={() => navigate(-1, false)}
                    onDown={() => navigate(1, false)}
                  />
                </View>
                <View style={s.row}>
                  <Btn
                    onPress={() => {
                      const ci = Math.floor(Math.random() * voiceMetas.length);
                      setCharIdx(ci);
                      setStyleIdx(
                        Math.floor(
                          Math.random() * (voiceMetas[ci]?.styles?.length || 1),
                        ),
                      );
                    }}
                  >
                    RND
                  </Btn>
                  <Btn onPress={apply}>適用</Btn>
                  <Btn
                    onPress={async () => {
                      apply();
                      try {
                        await speakText("テストなのだ");
                      } catch {}
                    }}
                  >
                    試聴
                  </Btn>
                </View>
              </>
            )}
          </View>
          <View style={s.hr} />
          <View style={s.footer}>
            <View style={s.row}>
              {selectedId && (
                <Btn onPress={() => selectReader(undefined)}>解除</Btn>
              )}
              <Btn onPress={onClose}>閉じる</Btn>
            </View>
          </View>
          <View style={s.status}>
            <Text style={s.txt}>{voiceLabel}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#f2f2f2",
    ...raised,
  },
  header: { backgroundColor: "#e6e6e6", padding: 12, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "bold", fontFamily: FONT },
  hr: {
    height: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#fff",
    borderBottomColor: "#888",
    marginVertical: 6,
  },
  body: { padding: 16, backgroundColor: "#f5f5f5" },
  txt: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: FONT,
    marginVertical: 4,
  },
  list: { marginVertical: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#bbb",
    marginBottom: 4,
  },
  itemSel: { backgroundColor: "#333", borderColor: "#111" },
  check: { fontSize: 16, color: "#fff", marginLeft: 8 },
  wheel: { flex: 1, backgroundColor: "#e9e9e9", padding: 8, ...raised },
  window: {
    backgroundColor: "#f7f7f7",
    borderWidth: 2,
    borderTopColor: "#666",
    borderLeftColor: "#666",
    borderRightColor: "#fff",
    borderBottomColor: "#fff",
    padding: 6,
    alignItems: "center",
  },
  fade: { fontSize: 11, color: "#888", fontFamily: FONT, marginVertical: 1 },
  active: {
    fontSize: 14,
    color: "#111",
    fontWeight: "bold",
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontFamily: FONT,
    marginVertical: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
  },
  footer: { padding: 12, backgroundColor: "#ececec" },
  status: { padding: 6, backgroundColor: "#e0e0e0", ...raised },
});
