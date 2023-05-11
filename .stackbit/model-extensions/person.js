import Theme from '../../content/data/style.json';

export default {
    name: 'person',
    fields: [
        {
            name: 'styles',
            type: 'style',
            styles: {
                self: {
                    margin: 'tw0:96',
                    padding: 'tw0:96',
                    justifyContent: ['flex-start', 'flex-end', 'center'],
                    borderWidth: ['0', '1', '2', '4', '8'],
                    borderStyle: '*',
                    borderColor: [{
                        value: 'border-dark',
                        label: 'Dark',
                        color: Theme.dark,
                    }, {
                        value: 'border-light',
                        label: 'Light',
                        color: Theme.light,
                    }, {
                        value: 'border-neutral',
                        label: 'Neutral',
                        color: Theme.neutral,
                    }, {
                        value: 'border-neutralAlt',
                        label: 'Neutral alt',
                        color: Theme.neutralAlt,
                    }, {
                        value: 'border-primary',
                        label: 'Primary',
                        color: Theme.primary,
                    }],
                    borderRadius: '*',
                    textAlign: '*',
                }
            },
        },
    ]
};
