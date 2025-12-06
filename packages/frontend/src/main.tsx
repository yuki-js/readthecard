import { AppRegistry } from "react-native";
import App from "./App";

// React Native Web方式でアプリを登録
AppRegistry.registerComponent("ReadTheCard", () => App);

// DOMにマウント
AppRegistry.runApplication("ReadTheCard", {
  rootTag: document.getElementById("root"),
});
