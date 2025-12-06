/**
 * クライアントサイド jsapdu リモート実装
 * @aokiapp/jsapdu-interface を正しく継承
 * サーバー側のSmartCardPlatformを完全にミラーリング
 * ローカルかリモートか区別できない
 */
export {
  RemoteSmartCardPlatform,
  RemoteSmartCardDeviceInfo,
  RemoteSmartCardError,
} from "./platform-proxy.js";
export { RemoteSmartCardDevice } from "./device-proxy.js";
export { RemoteSmartCard } from "./card-proxy.js";

// Re-export jsapdu-interface types for convenience
export {
  SmartCardPlatform,
  SmartCardDevice,
  SmartCard,
  SmartCardDeviceInfo,
  CommandApdu,
  ResponseApdu,
  SmartCardError,
} from "@aokiapp/jsapdu-interface";
