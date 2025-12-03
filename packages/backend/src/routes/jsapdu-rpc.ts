/**
 * jsapdu-over-ip RPC ルート (Hono)
 * SmartCardPlatformAdapter を Hono HTTP トランスポートで公開
 */

import { Hono } from 'hono';
import { 
  SmartCardPlatformAdapter,
  type ServerTransport,
  type RpcRequest,
  type RpcResponse,
  type RpcEvent,
} from '@readthecard/jsapdu-over-ip';

/**
 * Hono HTTP ServerTransport 実装
 */
class HonoServerTransport implements ServerTransport {
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
   * リクエストを処理
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
let transport: HonoServerTransport | null = null;
let pcscError: string | null = null;

export function createJsapduRpcRoutes(): Hono {
  const app = new Hono();

  // 初期化（遅延・動的インポート）
  const ensureInitialized = async () => {
    if (pcscError) return; // 既に失敗している場合はスキップ
    if (!adapter) {
      try {
        // 動的インポートでPCScライブラリの読み込みエラーを捕捉
        const { PcscPlatformManager } = await import('@aokiapp/jsapdu-pcsc');
        const platformManager = PcscPlatformManager.getInstance();
        const platform = platformManager.getPlatform();
        transport = new HonoServerTransport();
        adapter = new SmartCardPlatformAdapter(platform as any, transport);
        await adapter.start();
        console.log('jsapdu-over-ip RPCアダプタを初期化しました');
      } catch (error) {
        pcscError = String(error);
        console.warn('jsapdu-over-ip RPCアダプタの初期化に失敗:', error);
      }
    }
  };

  // RPC エンドポイント
  app.post('/rpc', async (c) => {
    await ensureInitialized();

    if (!transport) {
      return c.json({
        id: 'unknown',
        error: { 
          code: 'NOT_AVAILABLE', 
          message: pcscError || 'Smart card platform not available',
        },
      }, 503);
    }

    try {
      const request: RpcRequest = await c.req.json();
      const response = await transport.handleRequest(request);
      return c.json(response);
    } catch (error) {
      return c.json({
        id: 'unknown',
        error: { code: 'INTERNAL_ERROR', message: String(error) },
      }, 500);
    }
  });

  return app;
}
