/**
 * VOICEVOXルーター
 */

import { Router } from 'express';
import type { VoicevoxService } from '../services/voicevox-service.js';

export function createVoicevoxRouter(voicevoxService: VoicevoxService): Router {
  const router = Router();

  // 音声合成
  router.post('/synthesis', async (req, res) => {
    try {
      const { text, speakerId } = req.body as { text: string; speakerId: number };
      
      if (!text) {
        res.status(400).json({ error: 'テキストが必要です' });
        return;
      }

      const audioData = await voicevoxService.synthesis(text, speakerId || 3);
      
      res.set('Content-Type', 'audio/wav');
      res.send(Buffer.from(audioData));
    } catch (error) {
      console.error('音声合成エラー:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
