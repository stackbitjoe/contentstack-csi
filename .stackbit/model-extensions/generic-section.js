export default {
    name: 'generic_section',
    fields: [
        {
            name: 'styles',
            type: 'style',
            styles: {
                self: {
                    margin: 'tw0:96',
                    padding: 'tw0:96',
                    flexDirection: '*',
                    alignItems: ['flex-start', 'flex-end', 'center'],
                    justifyContent: ['flex-start', 'flex-end', 'center'],
                },
                subtitle: {
                    fontStyle: '*',
                    fontWeight: ['400', '500', '700'],
                    textDecoration: '*',
                    textAlign: '*',
                },
                text: {
                    textAlign: '*',
                }
            }
        }
    ]
}