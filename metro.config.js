// metro.config.js - Aggressive fix to disable Hermes for web
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Platform-specific transformer to disable Hermes for web
config.transformer = {
  ...config.transformer,
  // Completely disable Hermes for web platform
  hermesParser: false,
  minifierPath: 'metro-minify-terser',
  getTransformOptions: async (entryPoints, options, getDependenciesOf) => {
    const isWeb = options.platform === 'web';
    return {
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
        // Force disable import.meta for web
        unstable_disableES6Transforms: isWeb,
      },
    };
  },
};

// Web-specific resolver
config.resolver = {
  ...config.resolver,
  platforms: ['web', 'ios', 'android', 'native'],
};

// Fix MIME types for web bundles
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Fix MIME type for bundle files
      if (req.url.includes('.bundle')) {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      }
      
      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      return middleware(req, res, next);
    };
  }
};

module.exports = config;