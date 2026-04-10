module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration\\.test\\.ts$'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
