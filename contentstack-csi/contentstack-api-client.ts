const contentstack = require('@contentstack/management');
const { v4: uuidv4 } = require('uuid');
import _ from 'lodash';

import { Stack } from '@contentstack/management/types/stack';
import { EntryData } from '@contentstack/management/types/stack/contentType/entry';
import {
    Document,
    UpdateOperation,
    UpdateOperationSet,
    UpdateOperationField,
    UpdateOperationValueField,
    ModelMap,
    Model,
    Field,
    FieldObject,
    Cache,
    UpdateOperationListFieldItem,
    Logger,
} from '@stackbit/types';
import { ContentStackSourceOptions, ExtendedAsset } from './types';

const systemFields = [
    'stackHeaders',
    'content_type_uid',
    'urlPath',
    'tags',
    'locale',
    'uid',
    'ACL',
    '_version',
    '_in_progress',
    'content_type',
    'schema',
    'update',
    'delete',
    'fetch',
    'publish',
    'unpublish',
    'publishRequest',
    'setWorkflowStage',
    'import',
];

type ClientInitOptions = ContentStackSourceOptions & { logger: Logger };

export class ContentStackClient {
    private readonly client: Stack;
    private logger: Logger;

    constructor({ apiKey, managementToken, logger }: ClientInitOptions) {
        this.logger = logger;
        this.client = contentstack.client({}).stack({ api_key: apiKey, management_token: managementToken });
    }

    async uploadImage(filename: string, title: string) {
        return this.client.asset().create({
            upload: filename,
            title,
        });
    }

    async getItemTypes() {
        return this.client.contentType().query().find();
    }

    async getGlobalFields() {
        return this.client.globalField().query().find();
    }

    getItems(type: string) {
        return this.client
            .contentType(type)
            .entry()
            .query({
                include_publish_details: true,
            })
            .find()
            .then(({ items }) => items);
    }

    getAssets(): Promise<ExtendedAsset[]> {
        return this.client
            .asset()
            .query({
                include_publish_details: true,
            })
            .find()
            .then(({ items }) => items as unknown as ExtendedAsset[]);
    }

    createDocument(
        model: Model,
        fields: Record<string, UpdateOperationField>,
        getDocumentById: Cache['getDocumentById'],
        modelMap: ModelMap
    ) {
        const modelName = model.name;

        const entry = Object.entries(fields).reduce(
            (acc: EntryData, [key, value]) => {
                acc[key] = this.transformSetFieldValue(
                    value,
                    model.fields?.find((f) => f.name === key) as Field,
                    getDocumentById,
                    model,
                    modelMap
                );
                return acc;
            },
            { title: uuidv4() }
        );

        this.logger.debug('createDocument: ' + JSON.stringify(entry, null, 2));

        return this.client.contentType(modelName).entry().create({ entry });
    }

    convertField(field: UpdateOperationField, getDocumentById: Cache['getDocumentById']): any {
        if (field.type === 'list') {
            return _.flatten(field.items.map((item: UpdateOperationField) => this.convertField(item, getDocumentById)));
        }

        if (field.type === 'style' && typeof field.value !== 'string') {
            return JSON.stringify(field.value);
        }

        if (field.type === 'reference' && field.refType === 'asset') {
            return field.refId;
        }

        if (field.type === 'reference') {
            const refDoc = getDocumentById(field.refId);

            return {
                uid: field.refId,
                _content_type_uid: refDoc?.modelName,
            };
        }

        if (field.type === 'model') {
            const modelName =
                field.modelName.indexOf('BLOCK_') > -1 ? field.modelName.split('__').at(-1) : field.modelName;

            return Object.entries(field.fields).reduce(
                (acc: Record<string, any>, [key, currentFieldValue]) => {
                    acc[key] = this.convertField(currentFieldValue, getDocumentById);
                    return acc;
                },
                { _content_type_uid: modelName }
            );
        }

        return (field as UpdateOperationValueField).value;
    }

    async deleteDocument(type: string, id: string) {
        return await this.client.contentType(type).entry(id).delete();
    }

    async getItem(type: string, id: string) {
        return this.client.contentType(type).entry(id).fetch();
    }

    transformSetFieldValue(
        field: UpdateOperationField,
        modelField: Field,
        getDocumentById: Cache['getDocumentById'],
        model: Model,
        modelMap: ModelMap
    ): any {
        this.logger.debug(
            `transformSetFieldValue, field: ${modelField.name}, update: ${JSON.stringify(field, null, 2)}, model: ${JSON.stringify(modelField, null, 2)}`
        );

        if (typeof field !== 'object') {
            return field;
        }

        switch (field.type) {
            case 'list': {
                return field.items.map((listItem: UpdateOperationListFieldItem) => {
                    let fieldData = modelField;
                    let currentModel = model;

                    if (listItem.type === 'reference') {
                        if (listItem?.refType === 'asset') {
                            return listItem.refId;
                        }

                        const document = getDocumentById(listItem?.refId);

                        return document
                            ? {
                                uid: listItem.refId,
                                _content_type_uid: document.modelName,
                            }
                            : null;
                    }

                    if (listItem.type === 'model') {
                        fieldData = { name: '', ...listItem, models: [listItem.modelName] };
                        currentModel = modelMap[listItem.modelName] as Model;
                    }

                    if (listItem.type === 'object') {
                        fieldData = {
                            name: 'Field',
                            type: 'object',
                            fields: Object.entries(listItem.fields).map(([fieldName, fieldData]) => ({
                                name: fieldName,
                                ...fieldData,
                            })) as Field[],
                        };
                    }

                    return this.transformSetFieldValue(listItem, fieldData, getDocumentById, currentModel, modelMap);
                });
            }
            case 'reference': {
                if (field?.refType === 'asset') {
                    return field.refId;
                }

                const document = getDocumentById(field?.refId);

                return document
                    ? {
                        uid: field.refId,
                        _content_type_uid: document.modelName,
                    }
                    : null;
            }
            case 'object': {
                return (modelField as FieldObject).fields.reduce((acc: Record<string, any>, curr) => {
                    // const value = ['object', 'model', 'reference', 'list'].includes(curr.type) ? field.fields[curr.name] : {
                    //     value: field.fields[curr.name],
                    //     type: curr.type,
                    // } as UpdateOperationValueField;

                    const value = field.fields[curr.name];

                    acc[curr.name] = this.transformSetFieldValue(
                        value!,
                        modelField,
                        getDocumentById,
                        model,
                        modelMap
                    );
                    return acc;
                }, {});
            }
            case 'model': {
                const modelName = field.modelName;
                const isBlocksModel = modelName.startsWith(`BLOCK_`);
                const fieldModel = modelMap[modelName] as Model;

                const result = (fieldModel.fields || []).reduce((acc: Record<string, any>, curr) => {

                    const currentFieldName = curr.name;
                    const modelField = (fieldModel.fields || []).find((f) => f.name === currentFieldName) as Field;
                    const rawValue = field.fields[currentFieldName];

                    if (rawValue) {
                        acc[currentFieldName] = this.transformSetFieldValue(
                            rawValue,
                            modelField,
                            getDocumentById,
                            fieldModel,
                            modelMap
                        );
                    }
                    return acc;
                }, {});

                return isBlocksModel
                    ? {
                        [modelName.split('__').at(-1) as string]: result,
                    }
                    : result;
            }
            case 'number': {
                return field.value || 0;
            }
            case 'string':
            case 'text': {
                return field.value || '';
            }
            case 'boolean': {
                return field.value || false;
            }
            case 'image': {
                return field.value || null;
            }
            default: {
                return (field as UpdateOperationValueField).value;
            }
        }
    }

    async updateDocument(
        document: Document,
        updateOps: UpdateOperation[],
        modelMap: ModelMap,
        getDocumentById: Cache['getDocumentById']
    ) {
        try {
            const doc = await this.getItem(document.modelName, document.id);

            const model = modelMap[document.modelName] as Model;

            const updateObjects = updateOps.map((updateOp) => {
                const { opType, fieldPath, modelField } = updateOp;

                switch (opType) {
                    case 'set': {
                        const fieldData = (updateOp as UpdateOperationSet).field;
                        let fieldValue = this.transformSetFieldValue(
                            fieldData,
                            { name: '', ...modelField },
                            getDocumentById,
                            model,
                            modelMap
                        );

                        const updateStatement = updateField(doc, fieldPath, fieldValue, model, modelMap);

                        return this.updateDoc(doc, updateStatement);
                    }
                    case 'unset': {
                        const updateStatement = updateField(doc, fieldPath, null, model, modelMap);

                        return this.updateDoc(doc, updateStatement);
                    }
                    case 'insert': {
                        const { item, index } = updateOp;

                        const container = getDataByPath(doc, fieldPath, model, modelMap) || [];
                        const convertedData = convertObject(container);

                        const fieldValue = this.transformSetFieldValue(
                            item,
                            { name: '', ...modelField },
                            getDocumentById,
                            model,
                            modelMap
                        );

                        convertedData.splice(index, 0, fieldValue);

                        const updateStatement = updateField(doc, fieldPath, convertedData, model, modelMap);

                        return this.updateDoc(doc, updateStatement);
                    }
                    case 'remove': {
                        const { index } = updateOp;

                        const container = getDataByPath(doc, fieldPath, model, modelMap);
                        const convertedData = convertObject(container);

                        convertedData.splice(index, 1);
                        const updateStatement = updateField(doc, fieldPath, convertedData, model, modelMap);

                        return this.updateDoc(doc, updateStatement);
                    }
                    case 'reorder': {
                        const { order } = updateOp;

                        const container = getDataByPath(doc, fieldPath, model, modelMap);
                        const convertedData = convertObject(container);

                        const reorderedItems = order.map((itemIndex) => convertedData.at(itemIndex));
                        const updateStatement = updateField(doc, fieldPath, reorderedItems, model, modelMap);

                        return this.updateDoc(doc, updateStatement);
                    }
                }
            });

            await Promise.all(updateObjects.filter(Boolean));
        } catch (e: any) {
            if (e.errors) {
                this.logger.error(`Error updating document: status ${e.status} (${e.statusText}), errors:`, e.errors);
            } else {
                this.logger.error('Error updating document:', e);
            }
            throw e;
        }
    }

    async publishDocuments(documents: Document[]) {
        await Promise.all([documents.map(({ id, modelName }) => this.publishDocument(id, modelName))]);
    }

    async publishDocument(id: string, modelName: string) {
        const item = await this.client.contentType(modelName).entry(id).fetch();
        return await item.publish({
            publishDetails: {
                environments: ['production'],
                locales: ['en-us'],
            },
        });
    }

    isWebhookConfigured(url?: string) {
        return this.client
            .webhook()
            .fetchAll()
            .then(({ items }) => items)
            .then((items) => !!items.find(({ name }) => name === `Stackbit ${url}`));
    }

    createWebhook(webhookUrl?: string) {
        return this.client.webhook().create({
            webhook: this.createWebhookObject(webhookUrl),
        });
    }

    createWebhookObject(url?: string) {
        return {
            name: `Stackbit ${url}`,
            channels: [
                'content_types.entries.create',
                'content_types.entries.update',
                'content_types.entries.delete',
                'content_types.entries.environments.publish.success',
                'content_types.entries.environments.unpublish.success',
                'assets.create',
                'assets.update',
                'assets.delete',
                'assets.environments.publish.success',
                'assets.environments.unpublish.success',
                'content_types.create',
                'content_types.update',
                'content_types.update',
                'global_fields.create',
                'global_fields.update',
                'global_fields.delete'
            ],
            destinations: [
                {
                    custom_header: [{ value: '', header_name: '' }],
                    http_basic_password: '',
                    http_basic_auth: '',
                    target_url: url,
                },
            ],
            retry_policy: 'manual',
            disabled: false,
        };
    }

    updateDoc(doc: Record<string, any>, updateStatement: Record<string, any>) {
        Object.keys(doc)
            .filter((item) => !systemFields.includes(item))
            .forEach((key) => {
                delete doc[key];
            });

        Object.assign(doc, updateStatement);

        this.logger.debug('updateDoc: ' + JSON.stringify(doc, null, 2));
        return doc.update();
    }
}

function isBlocksField(field: Field, modelName: string) {
    return (
        field.type === 'list' &&
        field.items.type === 'model' &&
        field.items.models?.some((fieldModel) => fieldModel.includes(`BLOCK_${modelName}__`))
    );
}

function generateBlockModelName(modelName: string, blockName: string) {
    return `BLOCK_${modelName}__${blockName}`;
}

function updateField(
    obj: any,
    fieldPath: (number | string)[],
    value: any,
    model: Model,
    modelMap: ModelMap
): Record<string, any> {
    if (fieldPath.length == 0) {
        return value;
    }

    const currentFieldName = fieldPath[0] as string;
    const modelField = (model.fields || []).find((field) => field.name === currentFieldName) as Field;

    if (fieldPath.length == 1) {
        return handleGroup(currentFieldName, modelField, value);
    }

    if (modelField.type === 'list') {
        const index = fieldPath[1] as number;

        if (modelField.items.type === 'model') {
            const isFieldBlockField = isBlocksField(modelField, model.name);
            const currentObject = obj[currentFieldName][index];

            const itemModelName = isFieldBlockField
                ? generateBlockModelName(model.name, Object.keys(currentObject)[0] as string)
                : (modelField.items.models[0] as string);
            const cleanBlockModelName = itemModelName.replace(`BLOCK_${model.name}__`, '');

            const data = {
                UPDATE: {
                    index,
                    data: isFieldBlockField
                        ? handleGroup(
                            itemModelName.replace(`BLOCK_${model.name}__`, ''),
                            modelField,
                            updateField(
                                currentObject[cleanBlockModelName],
                                fieldPath.slice(2),
                                value,
                                modelMap[itemModelName] as Model,
                                modelMap
                            )
                        )
                        : updateField(
                            currentObject,
                            fieldPath.slice(2),
                            value,
                            modelMap[itemModelName] as Model,
                            modelMap
                        ),
                },
            };

            return handleGroup(currentFieldName, modelField, data);
        }

        return {
            [currentFieldName]: {
                UPDATE: {
                    index,
                    data: updateField(obj[currentFieldName][index], fieldPath.slice(2), value, model, modelMap),
                },
            },
        };
    }

    return handleGroup(
        currentFieldName,
        modelField,
        updateField(obj[currentFieldName], fieldPath.slice(1), value, model, modelMap)
    );
}

function handleGroup(fieldName: string, modelField: Field, value: any) {
    if (modelField?.group) {
        return {
            [modelField.group]: {
                [fieldName]: value,
            },
        };
    }

    return {
        [fieldName]: value,
    };
}

function getDataByPath(obj: any, fieldPath: (number | string)[], model: Model, modelMap: ModelMap): any {
    if (fieldPath.length === 0) {
        return obj;
    }

    const currentFieldName = fieldPath[0] as string;
    const modelField = (model.fields || []).find((field) => field.name === currentFieldName);

    if (!modelField) {
        return getDataByPath(obj[currentFieldName], fieldPath.slice(1), model, modelMap);
    }

    if (fieldPath.length >= 2 && modelField.type === 'list' && modelField.items.type === 'model') {
        const isFieldBlockField = isBlocksField(modelField, model.name);
        const currentObj = handleGetDataGroup(obj, modelField);

        if (!isFieldBlockField) {
            return getDataByPath(
                currentObj,
                fieldPath.slice(1),
                modelMap[modelField.items.models[0] as string] as Model,
                modelMap
            );
        }

        const index = fieldPath[1] as number;
        const item = currentObj[index];

        const blockType = Object.keys(item)[0] as string;
        const blockModelName = generateBlockModelName(model.name, blockType);

        return getDataByPath(item[blockType], fieldPath.slice(2), modelMap[blockModelName] as Model, modelMap);
    }

    return getDataByPath(handleGetDataGroup(obj, modelField), fieldPath.slice(1), model, modelMap);
}

function handleGetDataGroup(obj: Record<string, any>, modelField: Field) {
    const fieldName = modelField.name;
    if (modelField.group) {
        return obj[modelField.group][fieldName];
    }

    return obj[fieldName];
}

function convertObject(obj: any): any {
    if (obj === null) {
        return obj;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(convertObject);
    }

    if (obj.hasOwnProperty('uid') && !obj.hasOwnProperty('_content_type_uid')) {
        return obj.uid;
    }

    return Object.entries(obj).reduce((acc: Record<string, any>, [key, value]) => {
        if (value === null) {
            return acc;
        }

        acc[key] = key === '_metadata' ? value : convertObject(value);
        return acc;
    }, {});
}
