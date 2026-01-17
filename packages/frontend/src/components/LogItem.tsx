import { useState, useEffect } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import type { LogItem as LogItemType } from "../managers/DumpRunner";

type Props = {
  logItem: LogItemType;
  collapseSignal?: number;
};

const FONT = '"MS ゴシック", "MS Gothic", monospace';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export default function LogItem({ logItem, collapseSignal }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiffMode, setShowDiffMode] = useState(false);

  const hasHistory = logItem.history && logItem.history.length > 1;

  const handlePress = () => {
    if (hasHistory) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleTimeClick = (e: any) => {
    e.stopPropagation();
    setShowDiffMode(!showDiffMode);
  };

  // 外部からの折りたたみシグナルに応答
  useEffect(() => {
    if (collapseSignal !== undefined && collapseSignal > 0) {
      setIsExpanded(false);
      setShowDiffMode(false);
    }
  }, [collapseSignal]);

  switch (logItem.kind) {
    case "message":
      return (
        <View style={styles.logItemContainer}>
          <Pressable onPress={handlePress}>
            <Text style={styles.logLine}>{String(logItem.payload ?? "")}</Text>
          </Pressable>
          {isExpanded && hasHistory && (
            <View style={styles.historyContainer}>
              {logItem.history!.map((h, hIdx) => {
                const prevTimestamp = hIdx > 0 ? logItem.history![hIdx - 1].timestamp : null;
                const diffMs = prevTimestamp !== null ? h.timestamp - prevTimestamp : null;
                const displayTime = showDiffMode && diffMs !== null
                  ? `+${diffMs}ms`
                  : formatTime(h.timestamp);
                
                return (
                  <View key={hIdx} style={styles.historyItem}>
                    <Pressable onPress={handleTimeClick}>
                      <Text style={styles.historyTime}>{displayTime}</Text>
                    </Pressable>
                    <Text style={styles.historyPayload}>
                      {String(h.payload ?? "")}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      );
    default:
      throw new Error("Unknown log kind: " + logItem.kind);
  }
}

const raised = {
  borderWidth: 2,
  borderTopColor: "#fff",
  borderLeftColor: "#fff",
  borderRightColor: "#777",
  borderBottomColor: "#777",
};

const styles = StyleSheet.create({
  logItemContainer: {},
  logLine: {
    fontSize: 20,
    fontFamily: FONT,
  },
  historyContainer: {
    borderLeftWidth: 3,
    borderLeftColor: "#999",
    backgroundColor: "#f9f9f9",
    padding: 8,
  },
  historyItem: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  historyTime: {
    fontSize: 16,
    fontFamily: FONT,
    color: "#666",
    marginRight: 12,
    minWidth: 120,
  },
  historyPayload: {
    fontSize: 16,
    fontFamily: FONT,
    color: "#444",
    flex: 1,
  },
});
