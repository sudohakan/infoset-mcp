const path = require('path');

// Mock dotenv so .env file doesn't override test env vars
jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('config.js', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set required fields
    process.env.INFOSET_BASE_URL = 'https://api.infoset.app';
    process.env.INFOSET_EMAIL = 'test@example.com';
    process.env.INFOSET_PASSWORD = 'test-pass';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadConfig() {
    return require('../src/config');
  }

  test('loads config with all required env vars', () => {
    const config = loadConfig();
    expect(config.infosetBaseUrl).toBe('https://api.infoset.app');
    expect(config.infosetEmail).toBe('test@example.com');
    expect(config.infosetPassword).toBe('test-pass');
  });

  test('throws on missing INFOSET_BASE_URL', () => {
    delete process.env.INFOSET_BASE_URL;
    expect(() => loadConfig()).toThrow('INFOSET_BASE_URL');
  });

  test('throws on missing INFOSET_EMAIL', () => {
    delete process.env.INFOSET_EMAIL;
    expect(() => loadConfig()).toThrow('INFOSET_EMAIL');
  });

  test('throws on missing INFOSET_PASSWORD', () => {
    delete process.env.INFOSET_PASSWORD;
    expect(() => loadConfig()).toThrow('INFOSET_PASSWORD');
  });

  test('throws listing all missing vars', () => {
    delete process.env.INFOSET_BASE_URL;
    delete process.env.INFOSET_EMAIL;
    delete process.env.INFOSET_PASSWORD;
    expect(() => loadConfig()).toThrow('INFOSET_BASE_URL');
    expect(() => loadConfig()).toThrow('INFOSET_EMAIL');
    expect(() => loadConfig()).toThrow('INFOSET_PASSWORD');
  });
});
