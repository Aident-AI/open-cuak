const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envLocalPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

// Load .env.test and override any existing variables
const envTestPath = path.resolve(__dirname, 'env.test.override');
if (fs.existsSync(envTestPath)) {
  const envTestConfig = dotenv.parse(fs.readFileSync(envTestPath));
  for (const key in envTestConfig) {
    process.env[key] = envTestConfig[key];
  }
}

jest.mock('nanoid', () => ({ nanoid: () => 'mocked-id' }));
jest.mock('~src/common/services/tab/ActiveTabService', () => ({
  ActiveTabService: class {
    static fetch = jest.fn().mockResolvedValue({ id: 1 });
  },
}));
jest.mock('~src/common/services/BroadcastService', () => ({
  BroadcastService: {
    send: jest.fn(),
  },
}));
jest.mock('~shared/logging/ALogger', () => ({
  ALogger: class {
    static log = (level, ...args) => console[level](...args);
    static verbose = (...args) => console.debug(...args);
    static debug = (...args) => console.debug(...args);
    static info = (...args) => console.info(...args);
    static warn = (...args) => console.warn(...args);
    static error = (...args) => console.error(...args);
  },
}));
