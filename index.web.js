// index.web.js - Custom web entry point
import { AppRegistry } from "react-native";
import { ExpoRoot } from "expo-router";

// Export the entry point
export default function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

AppRegistry.registerComponent("main", () => App);
AppRegistry.runApplication("main", {
  rootTag: document.getElementById("root"),
});
