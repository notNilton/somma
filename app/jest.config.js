/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: [
    '<rootDir>/services/__tests__/**/*.test.(ts|tsx)',
    '<rootDir>/context/__tests__/**/*.test.(ts|tsx)',
    '<rootDir>/components/__tests__/**/*.test.(ts|tsx)',
    '<rootDir>/tests/**/*.test.(ts|tsx)',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.svg$': '<rootDir>/tests/mocks/fileMock.js',
    '\\.(jpg|jpeg|png|gif|webp)$': '<rootDir>/tests/mocks/fileMock.js',
  },
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/demo.ts',
    '!app/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'text-summary'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'report.html',
      expand: true,
    }],
  ],
  testTimeout: 15000,
};