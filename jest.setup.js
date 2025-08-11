// Gesture Handler test setup
import "react-native-gesture-handler/jestSetup";

// Reanimated mock (must be before any tests)
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

// RN 0.79: prevent DevMenu/TurboModule errors in Jest
jest.mock("react-native/src/private/devmenu/DevMenu", () => ({}));

// RN 0.79: silence DevMenu/SettingsManager in Jest
jest.mock("react-native/src/private/devmenu/DevMenu", () => ({}));
jest.mock(
  "react-native/src/private/specs_DEPRECATED/modules/NativeSettingsManager",
  () => ({}),
);
jest.mock("react-native/Libraries/Settings/NativeSettingsManager", () => ({}));
jest.mock("react-native/Libraries/Settings/Settings", () => ({
  get: jest.fn(() => ({})),
  set: jest.fn(),
  watchKeys: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeListeners: jest.fn(),
}));

// (Optional) If you later see EventEmitter warnings, add this:
// jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
//   const { EventEmitter } = require('events');
//   return EventEmitter;
// });
