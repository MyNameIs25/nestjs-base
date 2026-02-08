export default {
  displayName: 'auth',
  preset: '../../jest.preset.js',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@app/common(|/.*)$': '<rootDir>/../../libs/common/src/$1',
  },
  coverageDirectory: '../../coverage/apps/auth',
};
