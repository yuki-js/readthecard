/**
 * Transport 抽象化層
 *
 * jsapdu-over-ip はトランスポート非依存（Transport Agnostic）
 * HTTP, WebSocket, IPC, その他任意のトランスポートを注入可能
 */

import type { RpcRequest, RpcResponse, RpcEvent } from "./types.js";

/**
 * クライアント側トランスポートインターフェース
 * RPC呼び出しを行うための抽象インターフェース
 */
export interface ClientTransport {
  /**
   * RPCリクエストを送信し、レスポンスを受け取る
   */
  call(request: RpcRequest): Promise<RpcResponse>;

  /**
   * イベントリスナーを登録（オプション）
   */
  onEvent?(callback: (event: RpcEvent) => void): () => void;

  /**
   * 接続を閉じる（オプション）
   */
  close?(): Promise<void>;
}

/**
 * サーバー側トランスポートインターフェース
 * クライアントからのRPCリクエストを受け取り、レスポンスを返す
 */
export interface ServerTransport {
  /**
   * RPCリクエストハンドラを登録
   */
  onRequest(handler: (request: RpcRequest) => Promise<RpcResponse>): void;

  /**
   * イベントをクライアントに送信
   */
  emitEvent(event: RpcEvent): void;

  /**
   * トランスポートを開始
   */
  start(): Promise<void>;

  /**
   * トランスポートを停止
   */
  stop(): Promise<void>;
}

/**
 * シンプルなfetchベースのHTTPクライアントトランスポート実装
 * 参考実装として提供
 */
export class FetchClientTransport implements ClientTransport {
  constructor(private readonly endpoint: string) {}

  async call(request: RpcRequest): Promise<RpcResponse> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return response.json();
  }
}

/**
 * コールバックベースのインメモリトランスポート（テスト用）
 */
export class InMemoryTransport implements ClientTransport, ServerTransport {
  private requestHandler?: (request: RpcRequest) => Promise<RpcResponse>;
  private eventCallbacks: Set<(event: RpcEvent) => void> = new Set();

  // ClientTransport
  async call(request: RpcRequest): Promise<RpcResponse> {
    if (!this.requestHandler) {
      return {
        id: request.id,
        error: { code: "NO_HANDLER", message: "No request handler registered" },
      };
    }
    return this.requestHandler(request);
  }

  onEvent(callback: (event: RpcEvent) => void): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  // ServerTransport
  onRequest(handler: (request: RpcRequest) => Promise<RpcResponse>): void {
    this.requestHandler = handler;
  }

  emitEvent(event: RpcEvent): void {
    for (const callback of this.eventCallbacks) {
      callback(event);
    }
  }

  async start(): Promise<void> {}
  async stop(): Promise<void> {}
}
