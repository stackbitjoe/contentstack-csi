const { getTheme } = require('./src/api');
const { saveTheme } = require('./helpers/theme')

let devServerStarted = false;

module.exports = {
    trailingSlash: true,
    eslint: {
        // Allow production builds to successfully complete even if your project has ESLint errors.
        ignoreDuringBuilds: true
    },
    redirects: async () => {
        // wait for the theme file to be created
        if (!devServerStarted) {
            devServerStarted = true;
            await getTheme().then(saveTheme);
        }

        return [];
    }
};
