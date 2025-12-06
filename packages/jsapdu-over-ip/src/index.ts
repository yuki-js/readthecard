/**
 * jsapdu-over-ip: jsapdu インターフェースを完全にプロキシ
 *
 * Transport Agnostic / Transport Switchable 設計
 * - トランスポート層は抽象化され、任意の実装を注入可能
 * - HTTP, WebSocket, IPC, その他任意のトランスポートに対応
 */

// 共通の型定義・プロトコル
export * from "./types.js";

// トランスポート抽象化層
export * from "./transport.js";

// クライアント側プロキシ（SmartCardPlatform等をミラーリング）
export * from "./client/index.js";

// サーバー側アダプタ（実際のSmartCardPlatformをラップ）
export * from "./server/index.js";
