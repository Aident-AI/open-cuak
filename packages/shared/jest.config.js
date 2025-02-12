module.exports = {
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: { '^~shared/(.*)$': '<rootDir>/src/$1' },
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: [],
};
