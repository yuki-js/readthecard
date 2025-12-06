/**
 * jsapdu-over-ip 通信プロトコル型定義
 * jsapduの全インターフェースをHTTP/WebSocket経由でプロキシするための型
 */

// ========================================
// デバイス情報（SmartCardDeviceInfoのシリアライズ形式）
// ========================================
export interface SerializedDeviceInfo {
  id: string;
  devicePath?: string;
  friendlyName?: string;
  description?: string;
  supportsApdu: boolean;
  supportsHce: boolean;
  isIntegratedDevice: boolean;
  isRemovableDevice: boolean;
  d2cProtocol: "iso7816" | "nfc" | "integrated" | "other" | "unknown";
  p2dProtocol: "usb" | "ble" | "nfc" | "integrated" | "other" | "unknown";
  apduApi: string[];
  antennaInfo?: {
    deviceSize: { width: number; height: number };
    antennas: Array<{ centerX: number; centerY: number; radius?: number }>;
    formFactor: "bifold" | "trifold" | "phone" | "tablet" | null;
  };
}

// ========================================
// RPC メッセージ型
// ========================================

// リクエストの基本型
export interface RpcRequest {
  id: string;
  method: string;
  params?: unknown[];
}

// レスポンスの基本型
export interface RpcResponse {
  id: string;
  result?: unknown;
  error?: RpcError;
}

// エラー型
export interface RpcError {
  code: string;
  message: string;
  data?: unknown;
}

// イベント通知型
export interface RpcEvent {
  event: string;
  target: "platform" | "device" | "card";
  targetId?: string;
  data?: unknown;
}

// ========================================
// Platform メソッド
// ========================================
export type PlatformMethod =
  | "platform.init"
  | "platform.release"
  | "platform.isInitialized"
  | "platform.getDeviceInfo"
  | "platform.acquireDevice";

// ========================================
// Device メソッド
// ========================================
export type DeviceMethod =
  | "device.getDeviceInfo"
  | "device.isSessionActive"
  | "device.isDeviceAvailable"
  | "device.isCardPresent"
  | "device.startSession"
  | "device.waitForCardPresence"
  | "device.release";

// ========================================
// Card メソッド
// ========================================
export type CardMethod =
  | "card.getAtr"
  | "card.transmit"
  | "card.reset"
  | "card.release";

// ========================================
// APDU シリアライズ形式
// ========================================
export interface SerializedCommandApdu {
  cla: number;
  ins: number;
  p1: number;
  p2: number;
  data: number[] | null; // Uint8Array -> number[]
  le: number | null;
}

export interface SerializedResponseApdu {
  data: number[]; // Uint8Array -> number[]
  sw1: number;
  sw2: number;
}

// ========================================
// API エンドポイント
// ========================================
export const API_ENDPOINTS = {
  // RPC エンドポイント
  RPC: "/api/jsapdu/rpc",

  // WebSocket エンドポイント（イベント用）
  WS: "/api/jsapdu/ws",
} as const;
