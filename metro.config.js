// metro.config.js - Optimized to prevent 409 conflicts
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced request deduplication and caching
const requestDeduplication = new Map();
const DEDUPLICATION_TIMEOUT = 5000; // 5 seconds

// Add support for ES modules and .mjs files
config.resolver.sourceExts.push('mjs');

// Enhanced transformer configuration
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-babel-transformer'),
  minifierConfig: {
    keep_quoted_props: true,
    mangle: {
      keep_quoted_props: true,
    },
  },
  // Optimize transform caching
  enableBabelRCLookup: false,
  enableBabelRuntime: false,
  hermesParser: true,
  // Add transform options for better performance
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Enhanced resolver configuration
config.resolver = {
  ...config.resolver,
  alias: {
    // Add any aliases you need here
  },
  platforms: ['ios', 'android', 'native', 'web'],
  // Improve module resolution performance
  hasteImplModulePath: undefined,
  dependencyExtractor: undefined,
};

// Cache configuration for better performance
config.cacheStores = [
  {
    name: 'FileStore',
    path: 'node_modules/.cache/metro'
  }
];

// Enhanced server configuration to prevent 409 conflicts
config.server = {
  ...config.server,
  // Increase timeout for slower operations
  timeout: 30000,
  // Enhanced middleware with request deduplication
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const originalUrl = req.url;
      const method = req.method;
      
      // Special handling for _expo/touch endpoint to prevent 409 conflicts
      if (originalUrl.includes('/_expo/touch')) {
        const requestKey = `${method}-${originalUrl}`;
        const now = Date.now();
        
        // Check if we have a recent request for the same endpoint
        if (requestDeduplication.has(requestKey)) {
          const requestInfo = requestDeduplication.get(requestKey);
          if (now - requestInfo.timestamp < DEDUPLICATION_TIMEOUT) {
            console.log(`🔄 Deduplicating request: ${requestKey}`);
            
            // If request is still in progress, wait for it
            if (requestInfo.promise) {
              requestInfo.promise
                .then(() => res.status(200).json({ status: 'completed' }))
                .catch(() => res.status(409).json({ 
                  error: 'Request conflict resolved', 
                  requestKey 
                }));
              return;
            } else {
              // Recent request completed, return 409 to indicate conflict
              return res.status(409).json({ 
                error: 'Recent request detected', 
                requestKey,
                suggestion: 'Retry after delay'
              });
            }
          }
        }
        
        // Create promise to track request completion
        let resolvePromise, rejectPromise;
        const requestPromise = new Promise((resolve, reject) => {
          resolvePromise = resolve;
          rejectPromise = reject;
        });
        
        // Store request info
        requestDeduplication.set(requestKey, {
          timestamp: now,
          promise: requestPromise
        });
        
        // Clean up old requests
        for (const [key, info] of requestDeduplication.entries()) {
          if (now - info.timestamp > DEDUPLICATION_TIMEOUT) {
            requestDeduplication.delete(key);
          }
        }
        
        // Wrap response to resolve promise when done
        const originalEnd = res.end;
        const originalSend = res.send;
        
        const cleanup = () => {
          const info = requestDeduplication.get(requestKey);
          if (info) {
            if (res.statusCode < 400) {
              resolvePromise();
            } else {
              rejectPromise(new Error(`Request failed with status ${res.statusCode}`));
            }
            // Remove promise but keep timestamp for deduplication
            requestDeduplication.set(requestKey, {
              timestamp: info.timestamp,
              promise: null
            });
          }
        };
        
        res.end = function(...args) {
          cleanup();
          return originalEnd.apply(this, args);
        };
        
        res.send = function(...args) {
          cleanup();
          return originalSend.apply(this, args);
        };
      }
      
      // Add general request logging for debugging
      if (process.env.NODE_ENV === 'development') {
        const startTime = Date.now();
        const originalEnd = res.end;
        
        res.end = function(...args) {
          const duration = Date.now() - startTime;
          if (duration > 1000) { // Log slow requests
            console.log(`🐌 Slow request: ${method} ${originalUrl} (${duration}ms)`);
          }
          if (res.statusCode >= 400) {
            console.log(`❌ Request failed: ${method} ${originalUrl} - ${res.statusCode}`);
          }
          return originalEnd.apply(this, args);
        };
      }
      
      return middleware(req, res, next);
    };
  }
};

// Watch options for better file watching performance
config.watchFolders = [
  // Add specific folders to watch if needed
];

// Ignore unnecessary files to improve performance
config.resolver.blacklistRE = /(.*\/__tests__\/.*|\.web\.(js|jsx|ts|tsx)$|\.stories\.(js|jsx|ts|tsx)$)/;

// Add custom asset extensions if needed
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  // Add any custom asset extensions here
];

// Performance optimizations
config.transformer.workerPath = require.resolve('metro/src/DeltaBundler/Worker');
config.transformer.maxWorkers = require('os').cpus().length;

// Better caching strategy
config.cacheVersion = '1.0';

// Project-specific optimizations
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add source map support for debugging
if (process.env.NODE_ENV === 'development') {
  config.serializer = {
    ...config.serializer,
    getPolyfills: () => require('react-native/rn-get-polyfills')(),
  };
}

// Export enhanced configuration
module.exports = config;