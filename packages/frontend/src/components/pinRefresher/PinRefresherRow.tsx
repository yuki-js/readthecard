import { useMemo } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { PinRefresherRunner } from "../../managers/PinRefresherRunner";
import { formatSw } from "./utils";
import { raised, styles, sunken } from "./styles";
import type { PinTarget, RowState } from "./types";

export default function PinRefresherRow({
  target,
  state,
  onChangePin,
  onCheck,
  onVerify,
  onBuilder,
  builderLabel,
}: {
  target: PinTarget;
  state: RowState;
  onChangePin: (v: string) => void;
  onCheck: () => void;
  onVerify: () => void;
  onBuilder?: () => void;
  builderLabel?: string;
}) {
  const aidFid = useMemo(() => {
    // stateless formatter
    const r = new PinRefresherRunner();
    return r.formatTargetAidFid(target);
  }, [target]);

  const busy = !!state.busy;
  const lastCheck = state.check?.remainingAttempts;
  const lastVerifyOk = state.verify?.ok;

  const btnStyle = ({ pressed }: { pressed: boolean }) => [
    styles.btn,
    raised,
    pressed && { ...raised, ...{ transform: [{ translateY: 1 }] } },
  ];

  return (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.name]}>{target.label}</Text>
      <Text style={[styles.cell, styles.aidFid]}>{aidFid}</Text>

      <View style={[styles.cell, styles.btnCell]}>
        <Pressable style={btnStyle} disabled={busy} onPress={onCheck}>
          <Text style={styles.btnText}>Check</Text>
        </Pressable>
        <Text style={styles.small}>
          {state.check
            ? lastCheck !== undefined
              ? `rem=${lastCheck}`
              : `SW=${formatSw(state.check.sw)}`
            : ""}
        </Text>
      </View>

      <View style={[styles.cell, styles.builderCell]}>
        {onBuilder ? (
          <Pressable style={btnStyle} disabled={busy} onPress={onBuilder}>
            <Text style={styles.btnText}>{builderLabel || "Build"}</Text>
          </Pressable>
        ) : (
          <Text style={styles.small}>—</Text>
        )}
      </View>

      <View style={[styles.cell, styles.pinCell]}>
        <TextInput
          style={[styles.pinInput, sunken]}
          value={state.pin}
          onChangeText={onChangePin}
          placeholder="PIN"
          secureTextEntry={false}
        />
        {state.error ? (
          <Text style={[styles.small, styles.err]}>ERR: {state.error}</Text>
        ) : null}
      </View>

      <View style={[styles.cell, styles.btnCell]}>
        <Pressable style={btnStyle} disabled={busy} onPress={onVerify}>
          <Text style={styles.btnText}>Verify</Text>
        </Pressable>
        <Text style={styles.small}>
          {state.verify
            ? lastVerifyOk
              ? "OK"
              : state.verify.remainingAttempts !== undefined
                ? `NG rem=${state.verify.remainingAttempts}`
                : `NG SW=${formatSw(state.verify.sw)}`
            : ""}
        </Text>
      </View>
    </View>
  );
}
