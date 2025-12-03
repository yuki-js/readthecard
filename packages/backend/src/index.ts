/**
 * マイナンバーカード読み取りバックエンドサーバー
 * Hono (v4.6.20) を使用
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import { createApiRoutes } from './routes/api.js';
import { createVoicevoxRoutes } from './routes/voicevox.js';
import { createJsapduRpcRoutes } from './routes/jsapdu-rpc.js';
import { CardService } from './services/card-service.js';
import { VoicevoxService } from './services/voicevox-service.js';

const PORT = Number(process.env.PORT) || 3001;

async function main() {
  const app = new Hono();
  
  // CORS設定
  app.use('*', cors());
  
  // カードサービスの初期化
  const cardService = new CardService();
  await cardService.initialize();
  
  // VOICEVOXサービスの初期化
  const voicevoxService = new VoicevoxService();
  await voicevoxService.initialize();
  
  // APIルートの設定
  app.route('/api', createApiRoutes(cardService));
  app.route('/api/voicevox', createVoicevoxRoutes(voicevoxService));
  
  // jsapdu-over-ip RPCエンドポイント
  app.route('/api/jsapdu', createJsapduRpcRoutes());
  
  // フロントエンドアセットの配信
  // ビルドされたフロントエンドを配信
  app.use('/*', serveStatic({ root: '../frontend/dist' }));
  
  // SPA用フォールバック
  app.get('*', serveStatic({ path: '../frontend/dist/index.html' }));
  
  // サーバー起動
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
  serve({
    fetch: app.fetch,
    port: PORT,
  });
}

main().catch((error) => {
  console.error('サーバーの起動に失敗しました:', error);
  process.exit(1);
});
