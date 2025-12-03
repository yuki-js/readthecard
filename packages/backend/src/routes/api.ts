/**
 * APIルーター
 */

import { Router } from 'express';
import { API_ENDPOINTS } from '@readthecard/jsapdu-over-ip';
import type { CardService } from '../services/card-service.js';
import type { ApiResponse, BasicFourResponse, DeviceInfoResponse } from '@readthecard/jsapdu-over-ip';

export function createApiRouter(cardService: CardService): Router {
  const router = Router();

  // デバイス一覧取得
  router.get('/devices', async (_req, res) => {
    try {
      const devices = await cardService.getDevices();
      const response: ApiResponse<DeviceInfoResponse[]> = {
        success: true,
        data: devices,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<DeviceInfoResponse[]> = {
        success: false,
        error: { error: String(error) },
      };
      res.status(500).json(response);
    }
  });

  // デバイス状態取得
  router.get('/devices/status', async (_req, res) => {
    try {
      const status = await cardService.getDeviceStatus();
      const response: ApiResponse<DeviceInfoResponse | null> = {
        success: true,
        data: status,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<DeviceInfoResponse | null> = {
        success: false,
        error: { error: String(error) },
      };
      res.status(500).json(response);
    }
  });

  // セッション開始
  router.post('/session/start', async (_req, res) => {
    try {
      const sessionId = await cardService.startSession();
      const response: ApiResponse<{ sessionId: string }> = {
        success: true,
        data: { sessionId },
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<{ sessionId: string }> = {
        success: false,
        error: { error: String(error) },
      };
      res.status(500).json(response);
    }
  });

  // セッション終了
  router.post('/session/end', async (_req, res) => {
    try {
      await cardService.endSession();
      const response: ApiResponse<void> = {
        success: true,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<void> = {
        success: false,
        error: { error: String(error) },
      };
      res.status(500).json(response);
    }
  });

  // カード待機
  router.get('/card/wait', async (req, res) => {
    try {
      const timeout = parseInt(req.query.timeout as string) || 30000;
      const cardPresent = await cardService.waitForCard(timeout);
      const response: ApiResponse<{ cardPresent: boolean }> = {
        success: true,
        data: { cardPresent },
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<{ cardPresent: boolean }> = {
        success: false,
        error: { error: String(error) },
      };
      res.status(500).json(response);
    }
  });

  // PIN検証
  router.post('/card/verify-pin', async (req, res) => {
    try {
      const { pin } = req.body as { pin: string };
      if (!pin || !/^\d{4}$/.test(pin)) {
        const response: ApiResponse<{ verified: boolean }> = {
          success: false,
          error: { error: 'PINは4桁の数字で入力してください' },
        };
        res.status(400).json(response);
        return;
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
      res.json(response);
    } catch (error) {
      const response: ApiResponse<{ verified: boolean }> = {
        success: false,
        error: { error: String(error) },
      };
      res.status(500).json(response);
    }
  });

  // 基本4情報読み取り
  router.get('/card/basic-four', async (_req, res) => {
    try {
      const basicFour = await cardService.readBasicFour();
      const response: ApiResponse<BasicFourResponse> = {
        success: true,
        data: basicFour,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<BasicFourResponse> = {
        success: false,
        error: { error: String(error) },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
