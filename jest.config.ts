import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    testMatch: ['**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    }
};

export default config;