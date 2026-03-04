export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['**/tests/e2e/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/mocks/**'],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
