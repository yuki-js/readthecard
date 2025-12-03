/**
 * クライアントサイド jsapdu プロキシ
 * @aokiapp/jsapdu-interface を正しく継承
 * サーバー側のSmartCardPlatformを完全にミラーリング
 * ローカルかリモートか区別できない
 */
export * from './platform-proxy.js';
export * from './device-proxy.js';
export * from './card-proxy.js';

// Re-export jsapdu-interface types for convenience
export {
  SmartCardPlatform,
  SmartCardDevice,
  SmartCard,
  SmartCardDeviceInfo,
  CommandApdu,
  ResponseApdu,
  SmartCardError,
} from '@aokiapp/jsapdu-interface';
