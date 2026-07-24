module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'backend/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../backend/src/$1',
    '^@nestjs/jwt$': '<rootDir>/node_modules/@nestjs/jwt',
    '^@nestjs/common$': '<rootDir>/node_modules/@nestjs/common',
    '^@nestjs/core$': '<rootDir>/node_modules/@nestjs/core',
    '^@nestjs/testing$': '<rootDir>/node_modules/@nestjs/testing',
    '^bcryptjs$': '<rootDir>/node_modules/bcryptjs',
    '^@prisma/client$': '<rootDir>/node_modules/@prisma/client',
  },
};
