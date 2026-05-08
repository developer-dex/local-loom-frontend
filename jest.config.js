/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', jsxImportSource: 'react' } }],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/*.test.ts', '**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(@expo-google-fonts|@expo|expo-font|expo-modules-core)/)',
  ],
  moduleNameMapper: {
    // Mock static file assets (images, fonts, etc.)
    '\\.(png|jpg|jpeg|gif|webp|ttf|otf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock SVG files
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
    // Mock react-native-safe-area-context
    'react-native-safe-area-context': '<rootDir>/__mocks__/react-native-safe-area-context.js',
    // Mock react-native-svg
    'react-native-svg': '<rootDir>/__mocks__/react-native-svg.js',
    // Mock react-native itself
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    // Mock expo-google-fonts (they export font asset references, not needed in tests)
    '@expo-google-fonts/(.*)': '<rootDir>/__mocks__/expoGoogleFontsMock.js',
  },
};
