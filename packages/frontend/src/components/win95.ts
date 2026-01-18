import { StyleSheet } from "react-native";

export const FONT = '"MS ゴシック", "MS Gothic", monospace';

export const raised = {
  borderWidth: 2,
  borderTopColor: "#fff",
  borderLeftColor: "#fff",
  borderRightColor: "#777",
  borderBottomColor: "#777",
} as const;

export const pressed = {
  borderTopColor: "#222",
  borderLeftColor: "#222",
  borderRightColor: "#bbb",
  borderBottomColor: "#bbb",
  transform: [{ translateY: 1 }],
} as const;

export const sunken = {
  borderWidth: 2,
  borderTopColor: "#666",
  borderLeftColor: "#666",
  borderRightColor: "#fff",
  borderBottomColor: "#fff",
} as const;

/**
 * Small helper when you want to spread into StyleSheet styles.
 * (`StyleSheet.create()` itself is still recommended for component styles.)
 */
export const win95 = StyleSheet.create({
  overlayDim: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  titleBar: {
    backgroundColor: "#000080",
  },
});
