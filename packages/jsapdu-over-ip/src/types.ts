/**
 * HTTP通信で使用するリクエスト/レスポンス型定義
 */

// デバイス情報
export interface DeviceInfoResponse {
  id: string;
  name: string;
  isCardPresent: boolean;
}

// PINの検証リクエスト
export interface VerifyPinRequest {
  pin: string;
}

// 基本4情報のレスポンス
export interface BasicFourResponse {
  name: string;      // 氏名
  address: string;   // 住所
  birthDate: string; // 生年月日
  sex: string;       // 性別
}

// エラーレスポンス
export interface ErrorResponse {
  error: string;
  code?: string;
  remainingAttempts?: number;
}

// APIエンドポイント
export const API_ENDPOINTS = {
  // デバイス関連
  DEVICES: '/api/devices',
  DEVICE_STATUS: '/api/devices/status',
  
  // カード操作
  WAIT_FOR_CARD: '/api/card/wait',
  VERIFY_PIN: '/api/card/verify-pin',
  READ_BASIC_FOUR: '/api/card/basic-four',
  
  // セッション管理
  START_SESSION: '/api/session/start',
  END_SESSION: '/api/session/end',
} as const;

// APIレスポンスの基本型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
}
