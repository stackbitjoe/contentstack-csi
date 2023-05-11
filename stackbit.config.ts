import { defineStackbitConfig } from '@stackbit/types';
import { ContentstackContentSource } from './contentstack-csi';
import modelExtensions from './.stackbit/model-extensions';

export default defineStackbitConfig({
    stackbitVersion: '~0.6.0',
    ssgName: 'nextjs',
    nodeVersion: '16',
    
    contentSources: [
        new ContentstackContentSource({
            apiKey: process.env.CONTENTSTACK_API_KEY,
            managementToken: process.env.CONTENTSTACK_MANAGEMENT_TOKEN,
        }),
    ],
    modelExtensions,
});
