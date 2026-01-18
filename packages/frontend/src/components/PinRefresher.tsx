import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useWindowedDialog } from "./WindowedDialog";
import {
  PIN_TARGETS,
  PinRefresherRunner,
  type PinTarget,
  type PinTargetId,
} from "../managers/PinRefresherRunner";
import PinBDobBuilderPopup from "./pinRefresher/PinBDobBuilderPopup";
import PinRefresherRow from "./pinRefresher/PinRefresherRow";
import { raised, styles, sunken } from "./pinRefresher/styles";
import type { PinBDobPopupState, RowState } from "./pinRefresher/types";
import { formatSw, now } from "./pinRefresher/utils";

export default function PinRefresher() {
  const { setStatus, setTitle } = useWindowedDialog();

  const runnerRef = useRef<PinRefresherRunner | null>(null);

  const targets = useMemo(() => PIN_TARGETS, []);

  const [rows, setRows] = useState<Record<PinTargetId, RowState>>({
    "kenkaku.pinA": { pin: "" },
    "kenkaku.pinB": { pin: "" },
    "kenkaku.birthPin": { pin: "" },
    "kenhojo.pinB": { pin: "" },
    "kenhojo.pin": { pin: "" },
    "jpki.authPin": { pin: "" },
    "jpki.signPin": { pin: "" },
  });

  const [pinBDobPopup, setPinBDobPopup] = useState<PinBDobPopupState>({
    open: false,
    target: undefined,
    dob: "",
    expireYear: "",
    securityCode: "",
  });

  useEffect(() => {
    setTitle("PIN リフレッシャー");
    setStatus("Ready");
  }, [setStatus, setTitle]);

  useEffect(() => {
    // Keep a single runner instance for the dialog lifetime.
    runnerRef.current = new PinRefresherRunner();
    return () => {
      const r = runnerRef.current;
      runnerRef.current = null;
      if (r) {
        // fire-and-forget
        r.release();
      }
    };
  }, []);

  const setRow = useCallback((id: PinTargetId, patch: Partial<RowState>) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }, []);

  const runWithTarget = useCallback(
    async (target: PinTarget, fn: (r: PinRefresherRunner) => Promise<void>) => {
      const r = runnerRef.current;
      if (!r) throw new Error("Runner not ready");

      setRow(target.id, { busy: true, error: undefined });
      try {
        setStatus(`Selecting ${target.label}...`);
        await r.selectTarget(target);
        await fn(r);
      } finally {
        setRow(target.id, { busy: false });
      }
    },
    [setRow, setStatus],
  );

  const doCheck = useCallback(
    async (target: PinTarget) => {
      await runWithTarget(target, async (r) => {
        setStatus("Checking retry count...");
        const res = await r.checkRetryCount();
        setRow(target.id, { check: { ...res, at: now() }, error: undefined });
        const rem = res.remainingAttempts;
        setStatus(
          rem !== undefined
            ? `${target.label}: remaining=${rem}`
            : `${target.label}: SW=${formatSw(res.sw)}`,
        );
      }).catch((e) => {
        setRow(target.id, {
          error: e instanceof Error ? e.message : String(e),
        });
        setStatus("Error");
      });
    },
    [runWithTarget, setRow, setStatus],
  );

  const doVerify = useCallback(
    async (target: PinTarget) => {
      const pin = rows[target.id]?.pin ?? "";
      if (!pin) {
        setRow(target.id, { error: "PIN が空です" });
        return;
      }

      // 受理ルール（必要なら PIN_TARGETS 側に acceptRegex を定義する）
      const accept = target.acceptRegex;
      if (accept && !accept.test(pin)) {
        setRow(target.id, { error: `PIN が受理されません: ${accept}` });
        return;
      }

      await runWithTarget(target, async (r) => {
        setStatus("Verifying...");
        const res = await r.verifyPin(pin);
        setRow(target.id, { verify: { ...res, at: now() }, error: undefined });
        const rem = res.remainingAttempts;
        if (res.ok) {
          setStatus(`${target.label}: OK`);
        } else {
          setStatus(
            rem !== undefined
              ? `${target.label}: NG (remaining=${rem})`
              : `${target.label}: NG (SW=${formatSw(res.sw)})`,
          );
        }
      }).catch((e) => {
        setRow(target.id, {
          error: e instanceof Error ? e.message : String(e),
        });
        setStatus("Error");
      });
    },
    [rows, runWithTarget, setRow, setStatus],
  );

  const openCardPinBBuilderPopup = useCallback(() => {
    // 「券面PIN_B」は Kenhojo/Kenkaku の両方で同じ入力（DOB+ExpireYear+SecurityCode）を使う。
    // なので、どの行から開いても“共通ビルダー”として扱い、既存入力から推定して初期値に入れる。
    const kenkakuPinB = rows["kenkaku.pinB"]?.pin ?? "";
    const kenhojoPinB = rows["kenhojo.pinB"]?.pin ?? "";
    const birth = rows["kenkaku.birthPin"]?.pin ?? "";

    const srcPinB = kenkakuPinB || kenhojoPinB;

    const dobFromBirth = birth.length >= 6 ? birth.slice(0, 6) : "";
    const dobFromPinB = srcPinB.length >= 6 ? srcPinB.slice(0, 6) : "";
    const expFromPinB = srcPinB.length >= 10 ? srcPinB.slice(6, 10) : "";
    const secFromPinB = srcPinB.length >= 14 ? srcPinB.slice(10, 14) : "";

    setPinBDobPopup({
      open: true,
      // どこから開いたかのメモ用途
      target: "kenkaku.pinB",
      dob: dobFromBirth || dobFromPinB,
      expireYear: expFromPinB,
      securityCode: secFromPinB,
      error: undefined,
    });
  }, [rows]);

  const closePinBDobPopup = useCallback(() => {
    setPinBDobPopup((prev) => ({ ...prev, open: false, error: undefined }));
  }, []);

  const applyDobToBirthPin = useCallback(() => {
    const dob = pinBDobPopup.dob;
    if (dob.length !== 6) {
      setPinBDobPopup((prev) => ({
        ...prev,
        error: "DOB は 6桁(YYMMDD)で入力してください",
      }));
      return;
    }
    setRow("kenkaku.birthPin", { pin: dob, error: undefined });
    setPinBDobPopup((prev) => ({ ...prev, error: undefined }));
  }, [pinBDobPopup.dob, setRow]);

  const applyPinB = useCallback(() => {
    const { dob, expireYear, securityCode } = pinBDobPopup;
    if (
      dob.length !== 6 ||
      expireYear.length !== 4 ||
      securityCode.length !== 4
    ) {
      setPinBDobPopup((prev) => ({
        ...prev,
        error:
          "PIN_B は DOB(6)+ExpireYear(4)+SecurityCode(4) で入力してください",
      }));
      return;
    }

    const nextPinB = `${dob}${expireYear}${securityCode}`;

    setRow("kenhojo.pinB", { pin: nextPinB, error: undefined });
    setRow("kenkaku.pinB", { pin: nextPinB, error: undefined });

    setPinBDobPopup((prev) => ({ ...prev, error: undefined }));
  }, [
    pinBDobPopup.dob,
    pinBDobPopup.expireYear,
    pinBDobPopup.securityCode,
    setRow,
  ]);

  const header = useMemo(
    () => (
      <View style={styles.headerRow}>
        <Text style={[styles.hCell, styles.hName]}>PINターゲット名</Text>
        <Text style={[styles.hCell, styles.hAidFid]}>(AID:FID)</Text>
        <Text style={[styles.hCell, styles.hBtn]}>Check</Text>
        <Text style={[styles.hCell, styles.hBtn]}>Builder</Text>
        <Text style={[styles.hCell, styles.hPin]}>PIN input</Text>
        <Text style={[styles.hCell, styles.hBtn]}>Verify</Text>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <PinBDobBuilderPopup
        state={pinBDobPopup}
        onClose={closePinBDobPopup}
        onChange={(patch) => setPinBDobPopup((prev) => ({ ...prev, ...patch }))}
        onSetDob={applyDobToBirthPin}
        onSetPinB={applyPinB}
      />

      <View style={[styles.panel, raised]}>
        <Text style={styles.desc}>
          既存画面の「残回数ガード」で止まったときに、正しいPINで再VERIFYして残回数をリフレッシュするための隠し画面。
        </Text>
      </View>

      <View style={[styles.table, sunken]}>
        {header}
        <View style={styles.hr} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {targets.map((t) => (
            <PinRefresherRow
              key={t.id}
              target={t}
              state={rows[t.id]}
              onChangePin={(v) => setRow(t.id, { pin: v, error: undefined })}
              onCheck={() => doCheck(t)}
              onVerify={() => doVerify(t)}
              onBuilder={
                t.id === "kenkaku.pinB" ||
                t.id === "kenhojo.pinB" ||
                t.id === "kenkaku.birthPin"
                  ? openCardPinBBuilderPopup
                  : undefined
              }
              builderLabel={
                t.id === "kenkaku.pinB" || t.id === "kenhojo.pinB"
                  ? "券面PIN_B"
                  : t.id === "kenkaku.birthPin"
                    ? "DOB"
                    : undefined
              }
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
