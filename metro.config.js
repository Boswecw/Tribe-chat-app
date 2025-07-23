// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for ES modules
config.resolver.sourceExts.push('mjs');

// Handle import.meta issues
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_quoted_props: true,
    mangle: {
      keep_quoted_props: true,
    },
  },
};

module.exports = config;