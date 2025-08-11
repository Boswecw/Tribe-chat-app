// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force CJS build (no import.meta) for package-json-from-dist
const cjsPjfd = path.join(
  __dirname,
  'node_modules',
  'package-json-from-dist',
  'dist',
  'commonjs',
  'index.js'
);

const prevResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (ctx, moduleName, platform) => {
  if (
    moduleName === 'package-json-from-dist' ||
    moduleName === 'package-json-from-dist/dist/esm/index.js'
  ) {
    return { type: 'sourceFile', filePath: cjsPjfd };
  }
  return prevResolveRequest
    ? prevResolveRequest(ctx, moduleName, platform)
    : ctx.resolveRequest(ctx, moduleName, platform);
};

// Prefer CJS over ESM generally
config.resolver.resolverMainFields = ['react-native', 'main', 'module'];

module.exports = config;
