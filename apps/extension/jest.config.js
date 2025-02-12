module.exports = {
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^~icons/(.*)$': '<rootDir>/public/icons/$1',
    '^~shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^~src/(.*)$': '<rootDir>/src/$1',
  },
};
