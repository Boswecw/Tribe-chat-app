import expo from 'eslint-config-expo';

export default [
  ...expo,
  {
    rules: {
      // chill the noise a bit, but keep quality signals
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
