/**
 * ブラウザ用APIクライアント
 * jsapdu-over-ip のクライアントサイド実装
 */

import {
  API_ENDPOINTS,
  type ApiResponse,
  type DeviceInfoResponse,
  type BasicFourResponse,
  type VerifyPinRequest,
} from '../types.js';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  }

  /**
   * 利用可能なデバイス一覧を取得
   */
  async getDevices(): Promise<ApiResponse<DeviceInfoResponse[]>> {
    return this.request<DeviceInfoResponse[]>(API_ENDPOINTS.DEVICES);
  }

  /**
   * デバイスの状態を取得
   */
  async getDeviceStatus(): Promise<ApiResponse<DeviceInfoResponse>> {
    return this.request<DeviceInfoResponse>(API_ENDPOINTS.DEVICE_STATUS);
  }

  /**
   * セッションを開始
   */
  async startSession(): Promise<ApiResponse<{ sessionId: string }>> {
    return this.request<{ sessionId: string }>(API_ENDPOINTS.START_SESSION, {
      method: 'POST',
    });
  }

  /**
   * セッションを終了
   */
  async endSession(): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.END_SESSION, {
      method: 'POST',
    });
  }

  /**
   * カードの挿入を待機
   */
  async waitForCard(timeoutMs: number = 30000): Promise<ApiResponse<{ cardPresent: boolean }>> {
    return this.request<{ cardPresent: boolean }>(
      `${API_ENDPOINTS.WAIT_FOR_CARD}?timeout=${timeoutMs}`
    );
  }

  /**
   * PINを検証
   */
  async verifyPin(pin: string): Promise<ApiResponse<{ verified: boolean }>> {
    const body: VerifyPinRequest = { pin };
    return this.request<{ verified: boolean }>(API_ENDPOINTS.VERIFY_PIN, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * 基本4情報を読み取り
   */
  async readBasicFour(): Promise<ApiResponse<BasicFourResponse>> {
    return this.request<BasicFourResponse>(API_ENDPOINTS.READ_BASIC_FOUR);
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();
