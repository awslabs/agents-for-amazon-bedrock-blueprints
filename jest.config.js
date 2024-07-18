module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    testMatch: ['**/*.test.ts'],
    setupFiles: ['./test/setup.js'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    }
};
