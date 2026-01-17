import { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useWindowedDialog } from "./WindowedDialog";
import { DumpRunner, Log } from "../managers/DumpRunner";

type Props = { onClose?: () => void };

export default function MynaDump(_: Props) {
  const { setStatus, setTitle } = useWindowedDialog();

  useEffect(() => {
    setTitle("ダンプ");
    setStatus("Ready");
  }, [setStatus, setTitle]);

  const [signPin, setSignPin] = useState("");
  const onChangeSign = (v: string) =>
    setSignPin(
      v
        .toUpperCase()
        .replace(/[^0-9A-Z]/g, "")
        .slice(0, 16),
    );

  const [authPin, setAuthPin] = useState("");
  const onChangeAuth = (v: string) =>
    setAuthPin(v.replace(/[^0-9]/g, "").slice(0, 8));

  const [kenhojoPin, setKenhojoPin] = useState("");
  const onChangeKenhojo = (v: string) =>
    setKenhojoPin(v.replace(/[^0-9]/g, "").slice(0, 8));

  const [dob, setDob] = useState("");
  const onChangeDob = (v: string) =>
    setDob(v.replace(/[^0-9]/g, "").slice(0, 6));

  const [expireYear, setExpireYear] = useState("");
  const onChangeExpireYear = (v: string) =>
    setExpireYear(v.replace(/[^0-9]/g, "").slice(0, 4));

  const [securityCode, setSecurityCode] = useState("");
  const onChangeSecurityCode = (v: string) =>
    setSecurityCode(v.replace(/[^0-9]/g, "").slice(0, 8));

  const fillDefault = () => {
    setSignPin("ABC123"); // 6文字英数字（大文字）
    setAuthPin("1234"); // 数字
    setKenhojoPin("1234"); // 数字
    setDob("991299"); // YYMMDD
    setExpireYear("2029"); // 西暦4桁
    setSecurityCode("4072"); // 数字
  };

  const [logs, setLogs] = useState<Log>([]);
  const [artifacts, setArtifacts] = useState<any | null>(null);

  const runnerRef = useRef<DumpRunner | null>(null);
  const logScrollRef = useRef<any>(null);
  const submit = () => {
    setLogs([]);
    setArtifacts(null);
    setStatus("Running");
    const runner = new DumpRunner(
      signPin,
      authPin,
      kenhojoPin,
      dob.length === 6 ? dob : void 0,
      expireYear.length === 4 ? expireYear : void 0,
      securityCode.length === 4 ? securityCode : void 0,
    );
    runnerRef.current = runner;
    runner.onLogUpdated((log) => {
      setLogs(log);
      const arts = runnerRef.current?.artifacts ?? null;
      if (arts) {
        setArtifacts((prev: any | null) => prev ?? arts);
      }
    });

    runner.run();
  };

  const cancel = () => {
    runnerRef.current?.interrupt();
    setStatus("Cancelled");
    setArtifacts(null);
  };

  const downloadArtifacts = () => {
    const data = runnerRef.current?.artifacts ?? artifacts;
    if (!data) return;
    const filename = `myna_dump_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const json = JSON.stringify(data, null, 2);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      runnerRef.current?.log(
        "この環境ではダウンロード機能が未対応です。Webブラウザでご利用ください。",
      );
    }
  };
  const canDownload = !!(
    artifacts &&
    typeof artifacts === "object" &&
    Object.keys(artifacts).length > 0
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.form}>
          <View style={styles.row}>
            <Text style={styles.label}>Sign PIN</Text>
            <TextInput
              style={styles.input}
              value={signPin}
              onChangeText={onChangeSign}
              placeholder="6-16桁英数字"
              autoCapitalize="characters"
              maxLength={16}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Auth PIN</Text>
            <TextInput
              style={styles.input}
              value={authPin}
              onChangeText={onChangeAuth}
              placeholder="数字のみ"
              keyboardType="numeric"
              maxLength={8}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Kenhojo PIN</Text>
            <TextInput
              style={styles.input}
              value={kenhojoPin}
              onChangeText={onChangeKenhojo}
              placeholder="数字のみ"
              keyboardType="numeric"
              maxLength={8}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>DOB</Text>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={onChangeDob}
              placeholder="YYMMDD"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Expire Year</Text>
            <TextInput
              style={styles.input}
              value={expireYear}
              onChangeText={onChangeExpireYear}
              placeholder="西暦4桁"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Security Code</Text>
            <TextInput
              style={styles.input}
              value={securityCode}
              onChangeText={onChangeSecurityCode}
              placeholder="数字のみ"
              keyboardType="numeric"
              maxLength={8}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed: p }) => [styles.button, raised, p && pressed]}
              onPress={fillDefault}
            >
              <Text style={styles.buttonText}>Default</Text>
            </Pressable>

            <Pressable
              style={({ pressed: p }) => [styles.button, raised, p && pressed]}
              onPress={submit}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </Pressable>

            <Pressable
              disabled={!canDownload}
              style={({ pressed: p }) => [
                styles.button,
                raised,
                p && canDownload && pressed,
                !canDownload && styles.buttonDisabled,
              ]}
              onPress={downloadArtifacts}
            >
              <Text style={styles.buttonText}>Download</Text>
            </Pressable>

            <Pressable
              style={({ pressed: p }) => [styles.button, raised, p && pressed]}
              onPress={cancel}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>ログ</Text>
          <View style={styles.logBorder}>
            <ScrollView
              ref={logScrollRef}
              contentContainerStyle={styles.logScroll}
              onContentSizeChange={(w, h) => {
                try {
                  (logScrollRef.current as any)?.scrollToEnd?.({
                    animated: true,
                  });
                  (logScrollRef.current as any)?.scrollTo?.({
                    y: h,
                    animated: true,
                  });
                } catch {}
              }}
            >
              {logs.map((l, idx) => {
                switch (l.kind) {
                  case "message":
                    return (
                      <Text key={l.id} style={styles.logLine}>
                        {String(l.payload ?? "")}
                      </Text>
                    );
                  default:
                    throw new Error("Unknown log kind: " + l.kind);
                }
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

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
const sunken = {
  borderWidth: 2,
  borderTopColor: "#666",
  borderLeftColor: "#666",
  borderRightColor: "#fff",
  borderBottomColor: "#fff",
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 12,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  form: {
    flex: 1,
    minWidth: 100,
    maxWidth: 300,
    backgroundColor: "#e9e9e9",
    padding: 8,
    ...raised,
  },
  row: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 12,
  },
  label: {
    width: 160,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: FONT,
  },
  input: {
    flex: 1,
    ...sunken,
    backgroundColor: "#fff",
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: FONT,
  },
  actions: {
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 20,
    fontFamily: FONT,
  },
  logContainer: {
    flex: 1,
    marginTop: 0,
    marginLeft: 12,
  },
  logTitle: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: FONT,
    marginBottom: 8,
  },
  logBorder: {
    flex: 1,
    ...sunken,
    backgroundColor: "#fff",
  },
  logScroll: {
    padding: 12,
  },
  logLine: {
    fontSize: 20,
    fontFamily: FONT,
    marginBottom: 8,
  },
});
