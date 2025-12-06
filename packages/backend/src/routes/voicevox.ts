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

  app.get("/synthesis", async (c) => {
    try {
      const text = c.req.query("text");
      const speakerId = Number(c.req.query("speakerId")) || 3;

      if (!text) {
        return c.json({ error: "テキストが必要です" }, 400);
      }
      const audioData = await voicevoxService.synthesis(text, speakerId);
      return new Response(new Uint8Array(audioData).buffer as ArrayBuffer, {
        headers: { "Content-Type": "audio/wav" },
      });
    } catch (error) {
      console.error("音声合成エラー:", error);
      return c.json({ error: String(error) }, 500);
    }
  });

  // モデルメタ情報を返す
  app.get("/metas", async (c) => {
    try {
      const metas = voicevoxService.getModelMetas();
      return c.json(metas ?? []);
    } catch (error) {
      console.error("モデルメタ取得エラー:", error);
      return c.json({ error: String(error) }, 500);
    }
  });

  return app;
}
