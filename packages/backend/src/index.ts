/**
 * マイナンバーカード読み取りバックエンドサーバー
 */

import express from 'express';
import cors from 'cors';
import { createApiRouter } from './routes/api.js';
import { createVoicevoxRouter } from './routes/voicevox.js';
import { CardService } from './services/card-service.js';
import { VoicevoxService } from './services/voicevox-service.js';

const PORT = process.env.PORT || 3001;

async function main() {
  const app = express();
  
  // ミドルウェア設定
  app.use(cors());
  app.use(express.json());
  
  // カードサービスの初期化
  const cardService = new CardService();
  await cardService.initialize();
  
  // VOICEVOXサービスの初期化
  const voicevoxService = new VoicevoxService();
  await voicevoxService.initialize();
  
  // APIルーターの設定
  app.use('/api', createApiRouter(cardService));
  app.use('/api/voicevox', createVoicevoxRouter(voicevoxService));
  
  // サーバー起動
  app.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error('サーバーの起動に失敗しました:', error);
  process.exit(1);
});
