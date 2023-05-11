import _ from 'lodash';
import { Model, Field, FieldSpecificProps, FieldList } from '@stackbit/types';
import {
    ContentStackModel,
    ContentStackFieldBlocks,
    ContentStackFieldBlockItemSimple,
    ModelWithContext,
    ContentStackFieldBlockItemGlobalField,
    ContentStackField,
} from './types';

export function convertSchema(rawModel: ContentStackModel, isGlobalField = false): ModelWithContext[] {
    const modelsFromBlocks = extractBlockModels(rawModel);
    const model: Model = {
        name: rawModel.uid,
        label: rawModel.title,
        type: isGlobalField ? 'object' : 'data',
        fields: rawModel.schema.map((field) => convertField(field, rawModel.uid)).flat(),
    };

    return [model, ...(modelsFromBlocks as ModelWithContext[])];
}

export function convertField(field: ContentStackField, modelName: string): Field {
    const fieldData = getFieldTypeAndExtras(field, modelName);

    const commonProps = {
        name: field.uid,
        label: field.display_name,
        required: field.mandatory,
    };

    const defaultValue = typeof field.field_metadata?.default_value !== 'undefined' && field.field_metadata?.default_value !== '' && !_.isEmpty(field.field_metadata?.default_value) ? {
        default: field.field_metadata.default_value
    } : {};

    if (field.multiple || field.field_metadata?.ref_multiple || field.data_type === 'blocks') {
        return {
            ...commonProps,
            type: 'list',
            items: fieldData,
        } as FieldList;
    }

    return {
        ...commonProps,
        ...defaultValue,
        ...fieldData,
    };
}

function extractBlockModels(rawModel: ContentStackModel) {
    const blocks = rawModel.schema.filter((field) => {
        return field.data_type === 'blocks';
    }) as ContentStackFieldBlocks[];

    return blocks
        .map((block) =>
            block.blocks.map((block) => {
                if ((block as ContentStackFieldBlockItemSimple).schema) {
                    const item = {
                        ...(block as ContentStackFieldBlockItemSimple),
                        uid: `BLOCK_${rawModel.uid}__${block.uid}`,
                    };

                    return convertSchema(item, true);
                }

                const model: ModelWithContext = {
                    name: `BLOCK_${rawModel.uid}__${block.uid}`,
                    label: block.title,
                    type: 'object',
                    context: {
                        reference: (block as ContentStackFieldBlockItemGlobalField).reference_to,
                    },
                };

                return model;
            })
        )
        .flat();
}

function getFieldTypeAndExtras(field: ContentStackField, modelName: string): FieldSpecificProps {
    switch (field.data_type) {
        case 'text': {
            if (field.field_metadata?.markdown) {
                return {
                    type: 'markdown',
                };
            }

            if (field.field_metadata?.rich_text_type) {
                return {
                    type: 'markdown',
                };
            }

            if (field.field_metadata?.multiline) {
                return {
                    type: 'text',
                };
            }

            if (field.enum) {
                return {
                    type: 'enum',
                    options: field.enum.advanced
                        ? field.enum.choices.map((item) => ({ label: item.key, value: item.value }))
                        : field.enum.choices.map((item: { value: any }) => item.value),
                };
            }

            if (field.uid === 'slug' || (field.uid === 'url' && field.field_metadata['_default'] === true)) {
                return {
                    type: 'slug',
                };
            }

            return {
                type: 'string',
            };
        }
        case 'json':
            return {
                type: 'json',
            };
        case 'blocks': {
            return {
                type: 'model',
                models: field.blocks.map((block: Record<'uid', string>) => {
                    return `BLOCK_${modelName}__${block.uid}`;
                }),
            };
        }
        case 'number': {
            const min = typeof field.min !== 'undefined' ? { min: field.min } : {};
            const max = typeof field.max !== 'undefined' ? { max: field.max } : {};
            return {
                type: 'number',
                ...min,
                ...max,
            };
        }
        case 'boolean':
            return {
                type: 'boolean',
            };
        case 'isodate':
            return {
                type: 'date',
            };
        case 'file': {
            return {
                type: 'image',
            };
        }
        case 'link': {
            return {
                type: 'object',
                fields: [
                    { name: 'title', label: 'Title', type: 'string' },
                    { name: 'href', label: 'URL', type: 'string' },
                ],
            };
        }
        case 'reference': {
            return {
                type: 'reference',
                models: field.reference_to || [],
            };
        }
        case 'group': {
            return {
                type: 'object',
                fields: field.schema.map((groupField) => ({
                    ...convertField(groupField, modelName),
                })),
            };
        }
        case 'global_field': {
            return {
                type: 'model',
                models: [field.reference_to],
            };
        }
    }
}
