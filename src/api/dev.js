require('dotenv').config({ path: '../../.env' });
const contentstack = require('@contentstack/management');
const { inspect } = require('util');

const apiKey = process.env.CONTENTSTACK_API_KEY;
const managementToken = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;

const client = contentstack.client({}).stack({ api_key: apiKey, management_token: managementToken });

function getSlugs() {
    return client.contentType('page')
        .entry()
        .query()
        .find()
        .then(({ items }) => items.map((item) => item.slug))
}

const SYSTEM_FIELDS = [
    '_version',
    'locale',
    'uid',
    'ACL',
    '_in_progress',
    'created_at',
    'created_by',
    'tags',
    'updated_at',
    'updated_by',
    'publish_details',
    'stackHeaders',
    'urlPath',
    'content_type_uid',
    'content_type',
    'schema',

];

function getTheme() {
    return client.contentType('theme_style')
        .entry()
        .query()
        .find()
        .then(({ items }) => items[0])
        .then(processItem)
}

function processItem(item) {
    if (Array.isArray(item)) {
        return item.map(processItem);
    }

    if (typeof item === 'object' && item) {
        const initalValue = item.uid ? { __metadata: { id: item.uid } } : {};

        return Object.entries(item)
            .filter(([key, value]) => !(SYSTEM_FIELDS.includes(key) || typeof value === 'function'))
            .reduce((acc, [key, value]) => {
                if (key === '_content_type_uid') {
                    acc.__metadata.modelName = value;
                } else {
                    acc[toCamel(key)] = processItem(value);
                }
                return acc;
            }, initalValue);
    }

    if (typeof item === 'string' && item.startsWith('{') && item.endsWith('}')) {
        return JSON.parse(item);
    }

    return item;
}

function toCamel(s) {
    if (s === '__metadata') {
        return s;
    }

    return s.replace(/([-_][a-z])/ig, ($1) => {
        return $1.toUpperCase()
            .replace('-', '')
            .replace('_', '');
    });
};

function fectchItem(type, id) {
    return client.contentType(type)
        .entry(id)
        .fetch()
        .then(processItem)
        .catch(() => {});
}

function getSiteConfiguration() {
    return client.contentType('site_configuration')
        .entry()
        .query()
        .find()
        .then(({ items }) => items[0])
        .then(processItem)
        .then(fetchReferences)
        .then((item) => ({
            ...item,
            header: item.header?.length > 0 ? item.header[0] : {},
        }));
}

async function fetchReferences(obj) {
    if (Array.isArray(obj)) {
        return await Promise.all(obj.map(fetchReferences));
    }

    if (typeof obj === 'object' && obj) {
        if (Object.keys(obj).length === 1 && obj.hasOwnProperty('__metadata') && obj.__metadata.modelName) {
            const { modelName, id } = obj.__metadata;
            const result = await fectchItem(modelName, id).then(processItem).then(fetchReferences);

            return {
                ...result,
                ...obj,
            };
        }

        return await Promise.all(Object.entries(obj)
            .map(async ([key, value]) => {
                const data = await fetchReferences(value);
                return { key, value: data };
            })).then((keyValues) => keyValues.reduce((acc, { key, value }) => {
                acc[key] = value;
                return acc;
            }, {}));
    }

    return obj;
}

function getPageBySlug(slug = '') {
    return client.contentType('page')
        .entry()
        .query({
            query: {
                slug,
            },
            include_publish_details: true,
        })
        .find()
        .then(({ items }) => items[0])
        .then(processItem)
        .then(fetchReferences)
}

module.exports = {
    getSlugs,
    getPage: getPageBySlug,
    getTheme,
    getSiteConfiguration,
}
