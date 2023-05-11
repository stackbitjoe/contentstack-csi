import * as ContentSourceTypes from '@stackbit/types';
import { Entry } from '@contentstack/management/types/stack/contentType/entry';
import { Asset } from '@contentstack/management/types/stack/asset';

export interface ExtendedAsset extends Asset {
    uid: string;
    filename: string;
    url: string;
    content_type: string;
    file_size: string;
}

export type ContentStackFieldCommon = {
    uid: string;
    display_name: string;
    mandatory: boolean;
    unique: boolean;
    multiple: boolean;
    field_metadata: Record<string, any>;
};

export type ContentStackFieldSimpleType = ContentStackFieldCommon & {
    data_type: 'isodate' | 'boolean'  | 'file' | 'json';
};

export type ContentStackFieldNumber = ContentStackFieldCommon & {
    data_type:  'number';
    min?: number;
    max?: number;
};

export type ContentStackFieldGlobalField = ContentStackFieldCommon & {
    data_type: 'global_field';
    reference_to: string;
};

export type ContentStackFieldGroup = ContentStackFieldCommon & {
    data_type: 'group';
    schema: ContentStackField[];
};

export type ContentStackFieldReference = ContentStackFieldCommon & {
    data_type: 'reference';
    reference_to?: string[];
};

export type ContentStackFieldLink = ContentStackFieldCommon & {
    data_type: 'link';
};

export type ContenteStackFieldString = ContentStackFieldCommon & {
    data_type: 'text';
    field_metadata?: {
        markdown: boolean;
        rich_text_type: boolean;
        multiline: boolean;
    };
    enum?: ContentStackEnumSimple | ContentStackEnumAdvanced;
};

export type ContentStackEnumSimple = {
    advanced: false;
    choices: {
        value: any;
    }[];
};

export type ContentStackEnumAdvanced = {
    advanced: true;
    choices: {
        key: string;
        value: any;
    }[];
};

export type ContentStackFieldBlocks = ContentStackFieldCommon & {
    data_type: 'blocks';
    blocks: ContentStackFieldBlockItemSimple[] | ContentStackFieldBlockItemGlobalField[];
};

export type ContentStackFieldBlockItemGlobalField = ContentStackFieldBlockItemCommon & {
    reference_to: string;
};

export type ContentStackFieldBlockItemSimple = ContentStackFieldBlockItemCommon & {
    schema: ContentStackField[];
};

export type ContentStackFieldBlockItemCommon = {
    uid: string;
    title: string;
};

export type ContentStackField =
    | ContentStackFieldSimpleType
    | ContentStackFieldNumber
    | ContentStackFieldGroup
    | ContenteStackFieldString
    | ContentStackFieldGlobalField
    | ContentStackFieldReference
    | ContentStackFieldLink
    | ContentStackFieldBlocks;

export type FieldsContainer = {
    schema: ContentStackField[];
};

export type ContentStackModel = FieldsContainer & {
    created_at?: string;
    updated_at?: string;
    title: string;
    uid: string;
};

export type WebhookPayloadEvent = {
    event: 'create' | 'update' | 'publish' | 'unpublish' | 'delete';
};

export type WebhookPayloadEntry = WebhookPayloadEvent & {
    module: 'entry';
    data: {
        entry: Entry & {
            uid: string;
        };
        content_type: {
            uid: string;
        };
    };
};

export type WebhookPayloadAsset = WebhookPayloadEvent & {
    module: 'asset';
    data: {
        asset: ExtendedAsset;
    };
};

export type WebhookPayloadContentType = WebhookPayloadEvent & {
    module: 'content_type',
    data: {},
};

export type WebhookPayloadGlobalField = WebhookPayloadEvent & {
    module: 'global_field',
    data: {},
};

export type WebhookPayload = WebhookPayloadAsset | WebhookPayloadEntry | WebhookPayloadContentType | WebhookPayloadGlobalField;

export type ModelWithContext = ContentSourceTypes.Model & { context?: Record<string, any> };

export interface ContentStackSourceOptions {
    apiKey: string;
    managementToken: string;
}
