export default {
  displayName: 'email',
  preset: '../../jest.preset.js',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@app/common(|/.*)$': '<rootDir>/../../libs/common/src/$1',
    '^@email/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: '../../coverage/apps/email',
};
