import { View, Text, Pressable, TextInput } from "react-native";
import { pressed, raised, styles, sunken } from "./styles";
import type { PinBDobPopupState } from "./types";

export default function PinBDobBuilderPopup({
  state,
  onClose,
  onChange,
  onSetDob,
  onSetPinB,
}: {
  state: PinBDobPopupState;
  onClose: () => void;
  onChange: (
    patch: Partial<Pick<PinBDobPopupState, "dob" | "expireYear" | "securityCode" | "error">>,
  ) => void;
  onSetDob: () => void;
  onSetPinB: () => void;
}) {
  if (!state.open) return null;

  return (
    <View style={styles.popupOverlay}>
      <View style={[styles.popupWindow, raised]}>
        <View style={styles.popupTitleRow}>
          <Text style={styles.popupTitleText}>
            Builder: 券面PIN_B (DOB+ExpireYear+SecurityCode)
          </Text>
          <Pressable
            onPress={onClose}
            style={({ pressed: p }) => [styles.popupCloseBtn, raised, p && pressed]}
          >
            <Text style={styles.popupCloseText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.popupBody}>
          <View style={styles.popupFieldRow}>
            <Text style={styles.popupLabel}>DOB (YYMMDD)</Text>
            <TextInput
              style={[styles.popupInput, sunken]}
              value={state.dob}
              onChangeText={(v) =>
                onChange({
                  dob: v.replace(/[^0-9]/g, "").slice(0, 6),
                  error: undefined,
                })
              }
              keyboardType="numeric"
              placeholder="991299"
              maxLength={6}
            />
          </View>

          <View style={styles.popupFieldRow}>
            <Text style={styles.popupLabel}>ExpireYear (YYYY)</Text>
            <TextInput
              style={[styles.popupInput, sunken]}
              value={state.expireYear}
              onChangeText={(v) =>
                onChange({
                  expireYear: v.replace(/[^0-9]/g, "").slice(0, 4),
                  error: undefined,
                })
              }
              keyboardType="numeric"
              placeholder="2029"
              maxLength={4}
            />
          </View>

          <View style={styles.popupFieldRow}>
            <Text style={styles.popupLabel}>SecurityCode (4)</Text>
            <TextInput
              style={[styles.popupInput, sunken]}
              value={state.securityCode}
              onChangeText={(v) =>
                onChange({
                  securityCode: v.replace(/[^0-9]/g, "").slice(0, 4),
                  error: undefined,
                })
              }
              keyboardType="numeric"
              placeholder="4072"
              maxLength={4}
            />
          </View>

          {state.error ? (
            <Text style={[styles.popupError, styles.err]}>ERR: {state.error}</Text>
          ) : null}

          <View style={styles.popupActions}>
            <Pressable
              style={({ pressed: p }) => [styles.btn, raised, p && pressed]}
              onPress={() => {
                onSetDob();
                onSetPinB();
              }}
            >
              <Text style={styles.btnText}>Apply (DOB + PIN_B)</Text>
            </Pressable>
            <Pressable style={({ pressed: p }) => [styles.btn, raised, p && pressed]} onPress={onClose}>
              <Text style={styles.btnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
