/**
 * VOICEVOXルート (Hono)
 */

import { Hono } from "hono";
import type { VoicevoxService } from "../services/voicevox-service.js";

export function createVoicevoxRoutes(voicevoxService: VoicevoxService): Hono {
  const app = new Hono();

  // 音声合成
  app.post("/synthesis", async (c) => {
    try {
      const { text, speakerId } = await c.req.json<{
        text: string;
        speakerId?: number;
      }>();

      if (!text) {
        return c.json({ error: "テキストが必要です" }, 400);
      }

      const audioData = await voicevoxService.synthesis(text, speakerId || 3);

      return new Response(new Uint8Array(audioData).buffer as ArrayBuffer, {
        headers: { "Content-Type": "audio/wav" },
      });
    } catch (error) {
      console.error("音声合成エラー:", error);
      return c.json({ error: String(error) }, 500);
    }
  });

  return app;
}
