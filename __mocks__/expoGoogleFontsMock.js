/**
 * Mock for @expo-google-fonts/* packages.
 * These packages export font asset references that are not needed in tests.
 */
module.exports = new Proxy(
  {},
  {
    get: (_, prop) => {
      if (prop === '__esModule') return true;
      if (prop === 'useFonts') return () => [true, null];
      // Return a string identifier for any font asset
      return String(prop);
    },
  },
);
