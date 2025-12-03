/**
 * APIルート (Hono)
 */

import { Hono } from 'hono';
import type { CardService } from '../services/card-service.js';
import type { ApiResponse, BasicFourResponse, DeviceInfoResponse } from '@readthecard/jsapdu-over-ip';

export function createApiRoutes(cardService: CardService): Hono {
  const app = new Hono();

  // デバイス一覧取得
  app.get('/devices', async (c) => {
    try {
      const devices = await cardService.getDevices();
      const response: ApiResponse<DeviceInfoResponse[]> = {
        success: true,
        data: devices,
      };
      return c.json(response);
    } catch (error) {
      const response: ApiResponse<DeviceInfoResponse[]> = {
        success: false,
        error: { error: String(error) },
      };
      return c.json(response, 500);
    }
  });

  // デバイス状態取得
  app.get('/devices/status', async (c) => {
    try {
      const status = await cardService.getDeviceStatus();
      const response: ApiResponse<DeviceInfoResponse | null> = {
        success: true,
        data: status,
      };
      return c.json(response);
    } catch (error) {
      const response: ApiResponse<DeviceInfoResponse | null> = {
        success: false,
        error: { error: String(error) },
      };
      return c.json(response, 500);
    }
  });

  // セッション開始
  app.post('/session/start', async (c) => {
    try {
      const sessionId = await cardService.startSession();
      const response: ApiResponse<{ sessionId: string }> = {
        success: true,
        data: { sessionId },
      };
      return c.json(response);
    } catch (error) {
      const response: ApiResponse<{ sessionId: string }> = {
        success: false,
        error: { error: String(error) },
      };
      return c.json(response, 500);
    }
  });

  // セッション終了
  app.post('/session/end', async (c) => {
    try {
      await cardService.endSession();
      const response: ApiResponse<void> = {
        success: true,
      };
      return c.json(response);
    } catch (error) {
      const response: ApiResponse<void> = {
        success: false,
        error: { error: String(error) },
      };
      return c.json(response, 500);
    }
  });

  // カード待機
  app.get('/card/wait', async (c) => {
    try {
      const timeout = parseInt(c.req.query('timeout') || '30000');
      const cardPresent = await cardService.waitForCard(timeout);
      const response: ApiResponse<{ cardPresent: boolean }> = {
        success: true,
        data: { cardPresent },
      };
      return c.json(response);
    } catch (error) {
      const response: ApiResponse<{ cardPresent: boolean }> = {
        success: false,
        error: { error: String(error) },
      };
      return c.json(response, 500);
    }
  });

  // PIN検証
  app.post('/card/verify-pin', async (c) => {
    try {
      const { pin } = await c.req.json<{ pin: string }>();
      if (!pin || !/^\d{4}$/.test(pin)) {
        const response: ApiResponse<{ verified: boolean }> = {
          success: false,
          error: { error: 'PINは4桁の数字で入力してください' },
        };
        return c.json(response, 400);
      }
      const result = await cardService.verifyPin(pin);
      const response: ApiResponse<{ verified: boolean }> = {
        success: true,
        data: { verified: result.verified },
      };
      if (!result.verified && result.remainingAttempts !== undefined) {
        response.error = {
          error: 'PINが正しくありません',
          remainingAttempts: result.remainingAttempts,
        };
      }
      return c.json(response);
    } catch (error) {
      const response: ApiResponse<{ verified: boolean }> = {
        success: false,
        error: { error: String(error) },
      };
      return c.json(response, 500);
    }
  });

  // 基本4情報読み取り
  app.get('/card/basic-four', async (c) => {
    try {
      const basicFour = await cardService.readBasicFour();
      const response: ApiResponse<BasicFourResponse> = {
        success: true,
        data: basicFour,
      };
      return c.json(response);
    } catch (error) {
      const response: ApiResponse<BasicFourResponse> = {
        success: false,
        error: { error: String(error) },
      };
      return c.json(response, 500);
    }
  });

  return app;
}
