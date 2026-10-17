module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Zero-Server Rule (ZS-1)
    'no-restricted-globals': [
      'error',
      { name: 'fetch', message: 'ZS-1: fetch is banned. DRISHTI-CUAS is strictly offline air-gapped.' },
      { name: 'XMLHttpRequest', message: 'ZS-1: XMLHttpRequest is banned.' },
      { name: 'WebSocket', message: 'ZS-1: WebSocket is banned.' },
      { name: 'EventSource', message: 'ZS-1: EventSource is banned.' },
    ],
    // Deterministic Simulation & Zero-Server (DT-2, ZS-1, DT-5)
    'no-restricted-properties': [
      'error',
      { object: 'Math', property: 'random', message: 'DT-2: Math.random() is FATAL. Use mulberry32 streams in src/sim/rng.ts.' },
      { object: 'navigator', property: 'sendBeacon', message: 'ZS-1: navigator.sendBeacon is banned.' },
      { object: 'Date', property: 'now', message: 'DT-5: Date.now() is banned in sim logic. Allowed only in src/db and src/ui.' },
      { object: 'performance', property: 'now', message: 'DT-5: performance.now() is banned in sim logic. Allowed only in src/sim/clock.ts.' },
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    // Override 1: src/db and src/ui allow Date.now()
    {
      files: ['src/db/**/*', 'src/ui/**/*'],
      rules: {
        'no-restricted-properties': [
          'error',
          { object: 'Math', property: 'random', message: 'DT-2: Math.random() is FATAL.' },
          { object: 'navigator', property: 'sendBeacon', message: 'ZS-1: navigator.sendBeacon is banned.' },
          { object: 'performance', property: 'now', message: 'DT-5: performance.now() is banned outside clock.ts.' },
        ],
      },
    },
    // Override 2: src/sim/clock.ts allows performance.now()
    {
      files: ['src/sim/clock.ts'],
      rules: {
        'no-restricted-properties': [
          'error',
          { object: 'Math', property: 'random', message: 'DT-2: Math.random() is FATAL.' },
          { object: 'navigator', property: 'sendBeacon', message: 'ZS-1: navigator.sendBeacon is banned.' },
          { object: 'Date', property: 'now', message: 'DT-5: Date.now() is banned in sim logic.' },
        ],
      },
    },
    // Override 3: scripts, tests, and tool config files
    {
      files: ['scripts/**/*', 'tests/**/*', '*.config.ts', '*.config.js'],
      rules: {
        'no-restricted-properties': 'off',
        'no-restricted-globals': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
