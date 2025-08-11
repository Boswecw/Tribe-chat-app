/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.js",
    // Optional: uncomment after installing @testing-library/react-native
    // '@testing-library/react-native/extend-expect',
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(?:" +
      [
        "react-native",
        "@react-native",
        "react-native-gesture-handler",
        "react-native-reanimated",
        "react-native-vector-icons",
        "react-native-safe-area-context",
        "react-native-screens",
        "@react-navigation",
        "expo",
        "expo-asset",
        "expo-constants",
        "expo-linking",
        "expo-font",
        "expo-router",
        "expo-modules-core",
      ].join("|") +
      ")/)",
  ],
};
