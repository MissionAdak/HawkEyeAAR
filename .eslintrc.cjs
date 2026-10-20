module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'src/config/config.generated.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'no-restricted-globals': ['error', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'],
    'no-restricted-properties': [
      'error',
      { object: 'Math', property: 'random', message: 'Math.random() is banned in sim/render/director. Use mulberry32 streams.' },
      { object: 'navigator', property: 'sendBeacon', message: 'Network beaconing is banned.' },
      { object: 'Date', property: 'now', message: 'Date.now() is banned in sim. Allowed only in src/db and src/ui via override.' },
      { object: 'performance', property: 'now', message: 'performance.now() is allowed only in src/sim/clock.ts to feed accumulator.' },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['src/db/**/*', 'src/ui/**/*', 'scripts/**/*', 'tests/**/*'],
      rules: {
        'no-restricted-properties': [
          'error',
          { object: 'Math', property: 'random', message: 'Math.random() is banned. Use seeded RNG.' },
          { object: 'navigator', property: 'sendBeacon', message: 'Network beaconing is banned.' },
        ],
      },
    },
    {
      files: ['src/sim/clock.ts'],
      rules: {
        'no-restricted-properties': [
          'error',
          { object: 'Math', property: 'random', message: 'Math.random() is banned in sim. Use mulberry32 streams.' },
          { object: 'navigator', property: 'sendBeacon', message: 'Network beaconing is banned.' },
          { object: 'Date', property: 'now', message: 'Date.now() is banned in sim.' },
        ],
      },
    },
  ],
};
