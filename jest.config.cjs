'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.mjs'],
  collectCoverageFrom: [
    'src/**/*.{js,mjs}',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 60,
      lines: 75,
      statements: 70,
    },
  },
  coverageDirectory: 'coverage',
  clearMocks: true,
  resetModules: false,
  testTimeout: 10000,
};
