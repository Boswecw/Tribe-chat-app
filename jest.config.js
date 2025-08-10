/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo(nent)?|@expo(nent)?/.*|react-clone-referenced-element|react-native-vector-icons|@react-navigation/.*))'
  ]
};
