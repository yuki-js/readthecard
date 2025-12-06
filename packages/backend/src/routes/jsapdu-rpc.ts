/**
 * jsapdu-over-ip RPC ルート (Hono)
 * SmartCardPlatformAdapter を Hono HTTP トランスポートで公開
 */

import { Hono } from "hono";
import {
  SmartCardPlatformAdapter,
  type ServerTransport,
  type RpcRequest,
  type RpcResponse,
  type RpcEvent,
} from "@aokiapp/jsapdu-over-ip";
import { getMockPlatform } from "../mock/mock-platform.js";

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
        error: { code: "NO_HANDLER", message: "No request handler registered" },
      };
    }
    return this.requestHandler(request);
  }
}

let adapter: SmartCardPlatformAdapter | null = null;
let transport: HonoServerTransport | null = null;
let pcscError: string | null = null;

// 環境変数でモックプラットフォームを使用するか判定
const USE_MOCK =
  process.env.USE_MOCK_PLATFORM === "true" ||
  process.env.USE_MOCK_PLATFORM === "1";

export function createJsapduRpcRoutes(): Hono {
  const app = new Hono();

  // 初期化（遅延・動的インポート）
  const ensureInitialized = async () => {
    if (pcscError) return; // 既に失敗している場合はスキップ
    if (!adapter) {
      try {
        let platform: any;

        if (USE_MOCK) {
          // モックプラットフォームを使用
          console.log("モックスマートカードプラットフォームを使用します");
          platform = getMockPlatform();
        } else {
          // 実際のPC/SCプラットフォームを使用
          try {
            const { PcscPlatformManager } =
              await import("@aokiapp/jsapdu-pcsc");
            const platformManager = PcscPlatformManager.getInstance();
            platform = platformManager.getPlatform();
          } catch (pcscImportError) {
            // PC/SCが利用できない場合はモックにフォールバック
            console.warn(
              "PC/SCプラットフォームが利用できません。モックにフォールバック:",
              pcscImportError,
            );
            platform = getMockPlatform();
          }
        }

        transport = new HonoServerTransport();
        adapter = new SmartCardPlatformAdapter(platform, transport);
        await adapter.start();
        console.log(
          "jsapdu-over-ip RPCアダプタを初期化しました",
          USE_MOCK ? "(モック)" : "(PC/SC)",
        );
      } catch (error) {
        pcscError = String(error);
        console.warn("jsapdu-over-ip RPCアダプタの初期化に失敗:", error);
      }
    }
  };

  // RPC エンドポイント
  app.post("/rpc", async (c) => {
    await ensureInitialized();

    if (!transport) {
      return c.json(
        {
          id: "unknown",
          error: {
            code: "NOT_AVAILABLE",
            message: pcscError || "Smart card platform not available",
          },
        },
        503,
      );
    }

    try {
      const request: RpcRequest = await c.req.json();
      const response = await transport.handleRequest(request);
      return c.json(response);
    } catch (error) {
      return c.json(
        {
          id: "unknown",
          error: { code: "INTERNAL_ERROR", message: String(error) },
        },
        500,
      );
    }
  });

  return app;
}
