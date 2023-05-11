const plugin = require('tailwindcss/plugin');
const themeStyle = require('./content/data/style.json');
// module.exports = {};
module.exports = {
    safelist: [
        {
            pattern: /^(bg-|border-|text-|p.?-|m.?-)/,
        },
    ],
    content: ['./src/**/*.{js,ts,jsx,tsx}', './.sourcebit-nextjs-cache.json'],
    theme: {
        extend: {
            boxShadow: {
                header: '0px 2px 8px rgba(27, 32, 50, .08)'
            },
            colors: {
                light: themeStyle.light,
                dark: themeStyle.dark,
                neutral: themeStyle.neutral,
                neutralAlt: themeStyle.neutralAlt,
                primary: themeStyle.primary
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Roboto Slab', 'serif']
            },
            gridTemplateColumns: {
                16: 'repeat(16, minmax(0, 1fr))'
            },
            gridColumnStart: {
                span4: 'span 4'
            },
            gridColumnEnd: {
                neg3: '-3',
                span4: 'span 4'
            },
            maxWidth: {
                sectionBody: '846px'
            },
            padding: {
                '2/3': '66.666%',
                '3/4': '75%',
                '9/16': '56.25%'
            },
            screens: {
                xs: '480px'
            },
            width: {
                formField: 'calc(50% - 1rem)'
            }
        }
    },
    plugins: [
        plugin(function ({ addBase, addComponents, theme }) {
            addBase({
                body: {
                    fontFamily: theme(`fontFamily.${themeStyle.fontBody}`)
                },
                'h1,h2,h3,h4,h5,h6,blockquote': {
                    fontFamily: theme(`fontFamily.${themeStyle.fontHeadlines}`)
                },
                'h1,.h1': {
                    fontSize: theme(`fontSize.${themeStyle.h1.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h1.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h1.letterSpacing}`),
                    textDecoration: themeStyle.h1.decoration,
                    textTransform: themeStyle.h1.case
                },
                'h2,.h2': {
                    fontSize: theme(`fontSize.${themeStyle.h2.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h2.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h2.letterSpacing}`),
                    textDecoration: themeStyle.h2.decoration,
                    textTransform: themeStyle.h2.case
                },
                'h3,.h3': {
                    fontSize: theme(`fontSize.${themeStyle.h3.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h3.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h3.letterSpacing}`),
                    textDecoration: themeStyle.h3.decoration,
                    textTransform: themeStyle.h3.case
                },
                'h4,.h4': {
                    fontSize: theme(`fontSize.${themeStyle.h4.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h4.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h4.letterSpacing}`),
                    textDecoration: themeStyle.h4.decoration,
                    textTransform: themeStyle.h4.case
                },
                h5: {
                    fontSize: theme(`fontSize.${themeStyle.h5.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h5.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h5.letterSpacing}`),
                    textDecoration: themeStyle.h5.decoration,
                    textTransform: themeStyle.h5.case
                },
                h6: {
                    fontSize: theme(`fontSize.${themeStyle.h6.size}`),
                    fontWeight: theme(`fontWeight.${themeStyle.h6.weight}`),
                    letterSpacing: theme(`letterSpacing.${themeStyle.h6.letterSpacing}`),
                    textDecoration: themeStyle.h6.decoration,
                    textTransform: themeStyle.h6.case
                }
            });
            addComponents({
                '.sb-component-button-primary': {
                    borderRadius: theme(`borderRadius.${themeStyle.primaryButton.borderRadius}`),
                    boxShadow: theme(`boxShadow.${themeStyle.primaryButton.shadow}`),
                    fontWeight: themeStyle.primaryButton.weight,
                    letterSpacing: theme(`letterSpacing.${themeStyle.primaryButton.letterSpacing}`),
                    padding: `${themeStyle.primaryButton.verticalPadding}px ${themeStyle.primaryButton.horizontalPadding}px`,
                    textTransform: themeStyle.primaryButton.case
                },
                '.sb-component-button-secondary': {
                    borderRadius: theme(`borderRadius.${themeStyle.secondaryButton.borderRadius}`),
                    boxShadow: theme(`boxShadow.${themeStyle.secondaryButton.shadow}`),
                    fontWeight: themeStyle.secondaryButton.weight,
                    letterSpacing: theme(`letterSpacing.${themeStyle.secondaryButton.letterSpacing}`),
                    padding: `${themeStyle.secondaryButton.verticalPadding}px ${themeStyle.secondaryButton.horizontalPadding}px`,
                    textTransform: themeStyle.secondaryButton.case
                },
                '.sb-component-link-primary': {
                    fontWeight: themeStyle.linkPrimary.weight,
                    letterSpacing: theme(`letterSpacing.${themeStyle.linkPrimary.letterSpacing}`),
                    textTransform: themeStyle.linkPrimary.case
                },
                '.sb-component-link-secondary': {
                    fontWeight: themeStyle.linkSecondary.weight,
                    letterSpacing: theme(`letterSpacing.${themeStyle.linkSecondary.letterSpacing}`),
                    textTransform: themeStyle.linkSecondary.case
                }
            });
        })
    ]
};
