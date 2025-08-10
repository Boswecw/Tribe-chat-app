/* eslint-env jest */

// Extend matchers + fetch polyfill
require('@testing-library/jest-native/extend-expect');
require('whatwg-fetch');

// Reanimated mock (must be mocked before imports that use it)
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Call setup if exposed (no optional-chaining to keep ESLint calm)
const reanimated = require('react-native-reanimated');
if (reanimated && typeof reanimated.setUpTests === 'function') {
  reanimated.setUpTests();
}

// Silence noisy warnings while keeping others
const originalWarn = console.warn.bind(console);
jest.spyOn(console, 'warn').mockImplementation((msg, ...rest) => {
  if (typeof msg === 'string' && msg.includes('useNativeDriver')) return;
  originalWarn(msg, ...rest);
});
