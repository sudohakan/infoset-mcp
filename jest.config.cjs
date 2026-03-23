'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.mjs'],
  collectCoverageFrom: [
    'src/**/*.{js,mjs}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  clearMocks: true,
  resetModules: false,
  testTimeout: 10000,
};
