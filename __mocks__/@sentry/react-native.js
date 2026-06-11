module.exports = {
  init: jest.fn(),
  wrap: (component) => component,
  reactNavigationIntegration: () => ({
    registerNavigationContainer: jest.fn(),
  }),
  setUser: jest.fn(),
  setTag: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
};
