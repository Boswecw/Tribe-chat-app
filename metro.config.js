// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for ES modules and .mjs files
config.resolver.sourceExts.push('mjs');

// Handle import.meta and ES module issues
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-babel-transformer'),
  minifierConfig: {
    keep_quoted_props: true,
    mangle: {
      keep_quoted_props: true,
    },
  },
};

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  alias: {
    // Add any aliases you need here
  },
  platforms: ['ios', 'android', 'native', 'web'],
};

// Configure transformer to handle node_modules ES modules
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;