/**
 * Dynamic Expo config — merges app.json and enables the Sentry build plugin
 * when SENTRY_ORG and SENTRY_PROJECT are set (e.g. in EAS or .env.local).
 *
 * @see https://docs.sentry.io/platforms/react-native/manual-setup/expo/
 */

/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT;

  const plugins = [...(config.plugins ?? [])];

  if (sentryOrg && sentryProject) {
    plugins.push([
      '@sentry/react-native/expo',
      {
        organization: sentryOrg,
        project: sentryProject,
      },
    ]);
  }

  return {
    ...config,
    plugins,
  };
};
