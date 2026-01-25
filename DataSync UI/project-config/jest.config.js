export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      useESM: true,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  testMatch: ["**/?(*.)+(spec|test).{js,ts,tsx}"],
  collectCoverageFrom: [
    "../apps/backend/server.js",
    "../apps/backend/server-utils/**/*.js",
    "../apps/frontend/src/**/*.{ts,tsx}",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  verbose: true,
};
