// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add reanimated plugin if you're using it (keep at the end)
      'react-native-reanimated/plugin',
    ],
  };
};