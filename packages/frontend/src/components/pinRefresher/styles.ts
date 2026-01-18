import { StyleSheet } from "react-native";
import { FONT, pressed, raised, sunken } from "../win95";

export { FONT, pressed, raised, sunken };

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
  },

  // popup
  popupOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  popupWindow: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#f0f0f0",
  },
  popupTitleRow: {
    height: 32,
    backgroundColor: "#000080",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  popupTitleText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontFamily: FONT,
    fontSize: 14,
  },
  popupCloseBtn: {
    width: 28,
    height: 22,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  popupCloseText: {
    fontSize: 16,
    color: "#333333",
    fontFamily: FONT,
    lineHeight: 16,
  },
  popupBody: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    gap: 10,
  },
  popupFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  popupLabel: {
    width: 150,
    fontFamily: FONT,
    fontSize: 12,
  },
  popupInput: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: FONT,
    fontSize: 12,
  },
  popupActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  popupError: {
    fontFamily: FONT,
    fontSize: 12,
  },

  // top panel
  panel: {
    backgroundColor: "#e9e9e9",
    padding: 10,
    gap: 8,
  },
  desc: {
    fontFamily: FONT,
    fontSize: 12,
    color: "#111",
  },
  builderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  builderInfo: {
    flex: 1,
    gap: 2,
  },
  builderText: {
    fontFamily: FONT,
    fontSize: 12,
    color: "#222",
  },

  // table
  table: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#dcdcdc",
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  hCell: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: "bold",
    color: "#111",
  },
  hName: { flex: 2 },
  hAidFid: { flex: 2 },
  hBtn: { flex: 1, textAlign: "center" },
  hPin: { flex: 3, textAlign: "center" },
  hr: {
    height: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#fff",
    borderBottomColor: "#888",
  },
  scrollContent: {
    padding: 6,
    gap: 6,
  },

  // row
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  cell: {
    backgroundColor: "#f7f7f7",
    padding: 6,
  },
  name: {
    flex: 2,
    fontFamily: FONT,
    color: "#111",
  },
  aidFid: {
    flex: 2,
    fontFamily: FONT,
    color: "#333",
  },
  btnCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  builderCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pinCell: {
    flex: 3,
    justifyContent: "flex-start",
    gap: 4,
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: FONT,
    fontSize: 12,
  },
  pinInput: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: FONT,
  },
  small: {
    fontFamily: FONT,
    fontSize: 10,
    color: "#444",
    textAlign: "center",
  },
  err: {
    color: "#cc0000",
  },
});
