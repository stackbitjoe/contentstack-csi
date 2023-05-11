import {
    Asset,
    Model,
    Field,
    Document,
    DocumentStatus,
    FieldListItemsModelProps,
    FieldListItemsObjectProps,
    FieldListModel,
} from '@stackbit/types';
import { Entry } from '@contentstack/management/types/stack/contentType/entry';
import { ExtendedAsset } from './types';

type ImageField = {
    uid?: string;
};

type Item = Record<string, any>;

export function transformDocument(
    document: Entry,
    model: Model,
    models: Record<string, Model>,
    options: { apiKey: string },
): Document {
    const { uid, created_at, updated_at } = document;

    const baseData: Omit<Document, 'fields'> = {
        type: 'document',
        id: uid,
        manageUrl: `https://app.contentstack.com/#!/stack/${options.apiKey}/content-type/${model.name}/en-us/entry/${uid}/edit`,
        modelName: model.name,
        status: getStatus(document),
        createdAt: created_at as string,
        updatedAt: updated_at as string,
        context: {},
    };

    const fieldsData = (model?.fields ?? []).reduce((acc: Record<string, any>, curr) => {
        acc[curr.name] = transformField(curr, model, models)(document);
        return acc;
    }, {});

    const result = {
        ...baseData,
        fields: fieldsData,
    };

    return result;
}

export function transformAsset<T>(asset: ExtendedAsset, options: { apiKey: string }): Asset<T> {
    const { uid: id, filename, url, content_type: contentType, file_size: size } = asset;
    const title = (asset as { title?: string }).title || filename;
    return {
        type: 'asset',
        id,
        manageUrl: `https://app.contentstack.com/#!/stack/${options.apiKey}/assets/${id}`,
        status: 'published',
        createdAt: asset.created_at as string,
        updatedAt: asset.updated_at as string,
        fields: {
            title: {
                type: 'string',
                localized: false,
                value: title,
            },
            file: {
                type: 'assetFile',
                url,
                fileName: filename,
                contentType,
                size: Number(size),
                dimensions: {},
            },
        },
        context: {} as T,
    };
}

function isBlockField(field: FieldListModel, modelName: string) {
    return field.items.models?.some((fieldModel) => fieldModel.includes(`BLOCK_${modelName}__`));
}

function transformField(
    field: Field,
    model: Pick<Model, 'name' | 'type' | 'fields'>,
    models: Record<string, Model>,
    isNested = false
): Function {
    switch (field.type) {
        case 'boolean':
        case 'string':
        case 'enum':
        case 'number':
        case 'markdown':
        case 'text':
        case 'slug':
        case 'color':
            return (item: Item) => {
                return {
                    type: field.type,
                    value: (!isNested && field.group ? item[field.group] : item)[field.name],
                };
            };
        case 'date':
        case 'datetime':
            return (item: Item) =>
                item[field.name]
                    ? {
                          type: field.type,
                          value: item[field.name],
                      }
                    : null;
        case 'json':
            return (item: Item) => {
                const fieldGroup = field.group;
                const fieldData = (fieldGroup ? item[fieldGroup] : item)[field.name];

                return {
                    type: field.type,
                    value: fieldData,
                };
            };
        case 'image':
            return (item: Item) => {
                const fieldGroup = field.group;
                const fieldData = (fieldGroup ? item[fieldGroup] : item)[field.name] as ImageField;

                return fieldData
                    ? {
                          type: 'reference',
                          refType: 'asset',
                          refId: fieldData?.uid,
                      }
                    : null;
            };
        case 'reference':
            return (item: Item) => {
                const fieldGroup = field.group;
                const fieldData = (fieldGroup ? item[fieldGroup] : item)[field.name];

                return fieldData?.length > 0
                    ? {
                          type: 'reference',
                          refType: 'document',
                          refId: fieldData[0].uid,
                      }
                    : null;
            };
        case 'object': {
            return (item: Item) => {
                const fieldGroup = field.group;
                const fieldData = (fieldGroup ? item[fieldGroup] : item)[field.name];

                return fieldData
                    ? {
                          type: 'object',
                          fields: (field.fields || []).reduce((acc: Record<string, any>, curr) => {
                              acc[curr.name] = transformField(
                                  curr,
                                  { name: `ContentStackObject-${field.name}`, type: 'object', fields: field.fields },
                                  models
                              )(fieldData);
                              return acc;
                          }, {}),
                      }
                    : null;
            };
        }
        case 'model':
            return (item: Item) => {
                const fieldGroup = field.group;
                const fieldData = (fieldGroup ? item[fieldGroup] : item)[field.name];

                const nestedModel = models[field.models[0] as string] as Model;

                return fieldData
                    ? {
                          type: 'model',
                          modelName: nestedModel.name,
                          fields: (nestedModel?.fields || []).reduce((acc: Record<string, any>, curr) => {
                              acc[curr.name] = transformField(curr, nestedModel as Model, models)(fieldData);
                              return acc;
                          }, {}),
                      }
                    : null;
            };
        case 'list':
            switch (field.items.type) {
                case 'model':
                    return (item: Item) => {
                        const fieldGroup = field.group;
                        const fieldData = (fieldGroup ? item[fieldGroup] : item)[field.name];

                        const blockField = isBlockField(field as FieldListModel, model.name);

                        return {
                            type: 'list',
                            items: ((fieldData || []) as any[])
                                .map((listItem) => {
                                    const itemTypeId: string = blockField
                                        ? (Object.keys(listItem)[0] as string)
                                        : ((field as FieldListItemsModelProps).items.models[0] as string);
                                    const nestedModel =
                                        models[blockField ? `BLOCK_${model.name}__${itemTypeId}` : itemTypeId];

                                    return {
                                        type: 'model',
                                        modelName: nestedModel?.name,
                                        fields: (nestedModel?.fields || []).reduce((acc: Record<string, any>, curr) => {
                                            acc[curr.name] = transformField(
                                                curr,
                                                nestedModel as Model,
                                                models
                                            )(blockField ? listItem[itemTypeId] : listItem);
                                            return acc;
                                        }, {}),
                                    };
                                })
                                .filter(Boolean),
                        };
                    };
                case 'reference':
                    return (item: Item) => ({
                        type: 'list',
                        items: (item[field.name] || []).map((listItem: Record<'uid', string>) => {
                            return {
                                type: 'reference',
                                refType: 'document',
                                refId: listItem.uid,
                            };
                        }),
                    });
                case 'image':
                    return (item: Item) => ({
                        type: 'list',
                        items: (item[field.name] || []).map((listItem: Record<'uid', string>) => {
                            return {
                                type: 'reference',
                                refType: 'asset',
                                refId: listItem.uid,
                            };
                        }),
                    });
                case 'object': {
                    return (item: Item) => {
                        const items = (field.group ? item[field.group] : item[field.name]) || [];
                        const objectFields = (field as FieldListItemsObjectProps).items.fields || [];

                        return {
                            type: 'list',
                            items: items.map((currentItem: Record<string, any>) => ({
                                type: 'object',
                                fields: objectFields.reduce((acc: Record<string, any>, currentField) => {
                                    acc[currentField.name] = transformField(
                                        currentField,
                                        { name: 'ContentStackObject', type: 'object', fields: objectFields },
                                        models,
                                        true
                                    )(currentItem);
                                    return acc;
                                }, {}),
                            })),
                        };
                    };
                }
                default:
                    return (item: Item) => ({
                        type: 'list',
                        items: ((item[field.name] || []) as any[]).map((listItem) => {
                            return {
                                type: field.items.type || 'string',
                                value: listItem,
                            };
                        }),
                    });
            }

        default:
            return (item: Item) => {};
    }
}

function getStatus(document: Entry): DocumentStatus {
    if (Array.isArray(document.publish_details) && document.publish_details.length > 0) {
        return document.publish_details.slice(-1)[0]?.time < (document.updated_at as string) ? 'modified' : 'published';
    }

    return 'added';
}
