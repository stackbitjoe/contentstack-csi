import React from 'react';
import { getComponent } from '../components/components-registry';
import { getPage, getSlugs, getSiteConfiguration } from '../api';

function Page(props) {
    const { page, site } = props;
    page.__metadata.modelName = 'PageLayout';

    const { modelName } = page.__metadata;
    
    const PageLayout = getComponent(modelName);
    if (!PageLayout) {
        throw new Error(`no page layout matching the page model: ${modelName}`);
    }
    return <PageLayout page={page} site={site} />;
}

export async function getStaticPaths() {
    const paths = await getSlugs();
    return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
    const urlPath = (params.slug || []).join('/');
    const page = await getPage(urlPath.startsWith('/') ? urlPath : `/${urlPath}`);
    const site = await getSiteConfiguration();

    return {
        props: {
            page,
            site,
        }
    };
}

export default Page;
