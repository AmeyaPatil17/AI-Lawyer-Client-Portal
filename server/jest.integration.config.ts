import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/integration/**/*.integration.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/tests/setupIntegration.ts'],
    testTimeout: 30000,
    globals: {
        'ts-jest': {
            tsconfig: {
                esModuleInterop: true,
            },
        },
    },
};

export default config;
