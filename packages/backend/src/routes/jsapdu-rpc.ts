/**
 * jsapdu-over-ip RPC ルート
 * SmartCardPlatformAdapter を Express HTTP トランスポートで公開
 */

import { Router } from 'express';
import { 
  SmartCardPlatformAdapter,
  type ServerTransport,
  type RpcRequest,
  type RpcResponse,
  type RpcEvent,
} from '@readthecard/jsapdu-over-ip';
import { PcscPlatformManager } from '@aokiapp/jsapdu-pcsc';

/**
 * Express HTTP ServerTransport 実装
 */
class ExpressServerTransport implements ServerTransport {
  private requestHandler?: (request: RpcRequest) => Promise<RpcResponse>;

  onRequest(handler: (request: RpcRequest) => Promise<RpcResponse>): void {
    this.requestHandler = handler;
  }

  emitEvent(_event: RpcEvent): void {
    // HTTPではイベントプッシュは未サポート（WebSocket等が必要）
  }

  async start(): Promise<void> {}
  async stop(): Promise<void> {}

  /**
   * Expressリクエストを処理
   */
  async handleRequest(request: RpcRequest): Promise<RpcResponse> {
    if (!this.requestHandler) {
      return {
        id: request.id,
        error: { code: 'NO_HANDLER', message: 'No request handler registered' },
      };
    }
    return this.requestHandler(request);
  }
}

let adapter: SmartCardPlatformAdapter | null = null;
let transport: ExpressServerTransport | null = null;

export function createJsapduRpcRouter(): Router {
  const router = Router();

  // 初期化（遅延）
  const ensureInitialized = async () => {
    if (!adapter) {
      try {
        const platformManager = PcscPlatformManager.getInstance();
        const platform = platformManager.getPlatform();
        transport = new ExpressServerTransport();
        adapter = new SmartCardPlatformAdapter(platform as any, transport);
        await adapter.start();
        console.log('jsapdu-over-ip RPCアダプタを初期化しました');
      } catch (error) {
        console.warn('jsapdu-over-ip RPCアダプタの初期化に失敗:', error);
      }
    }
  };

  // RPC エンドポイント
  router.post('/rpc', async (req, res) => {
    await ensureInitialized();

    if (!transport) {
      res.status(503).json({
        id: req.body?.id || 'unknown',
        error: { code: 'NOT_AVAILABLE', message: 'Smart card platform not available' },
      });
      return;
    }

    try {
      const request: RpcRequest = req.body;
      const response = await transport.handleRequest(request);
      res.json(response);
    } catch (error) {
      res.status(500).json({
        id: req.body?.id || 'unknown',
        error: { code: 'INTERNAL_ERROR', message: String(error) },
      });
    }
  });

  return router;
}
