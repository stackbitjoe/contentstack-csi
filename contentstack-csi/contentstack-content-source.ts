import { writeFileSync, unlinkSync } from 'fs';
import _ from 'lodash';
const { v4: uuidv4 } = require('uuid');

import { ContentStackClient } from './contentstack-api-client';
import { convertSchema } from './schema-converter';
import { transformAsset, transformDocument } from './entries-converter';
import { downloadFile } from './file-download';

import * as ContentSourceTypes from '@stackbit/types';
import { ContentStackModel, ContentStackSourceOptions, ExtendedAsset, WebhookPayload } from './types';

type UserContext = {};
type SchemaContext = {};
type DocumentContext = {};
type AssetContext = {};

export class ContentstackContentSource implements ContentSourceTypes.ContentSourceInterface<UserContext, SchemaContext, DocumentContext, AssetContext> {
    private contentStackClient!: ContentStackClient;
    private apiKey: string;
    private managementToken: string;
    private logger!: ContentSourceTypes.Logger;
    private cache!: ContentSourceTypes.Cache<SchemaContext, DocumentContext, AssetContext>;

    constructor({ apiKey, managementToken }: ContentStackSourceOptions) {
        this.apiKey = apiKey;
        this.managementToken = managementToken;
    }

    async destroy(): Promise<void> {
        return;
    }

    async getVersion(): Promise<ContentSourceTypes.Version> {
        return {
            contentSourceVersion: '0.0.1',
            interfaceVersion: '0.0.1',
        };
    }

    getContentSourceType(): string {
        return 'contentstack';
    }

    getProjectId(): string {
        return this.apiKey;
    }

    getProjectEnvironment(): string {
        return 'master';
    }

    getProjectManageUrl(): string {
        return `https://app.contentstack.com/#!/stack/${this.apiKey}/dashboard`;
    }

    async init({ logger, webhookUrl, cache }: ContentSourceTypes.InitOptions<SchemaContext, DocumentContext, AssetContext>): Promise<void> {
        this.logger = logger.createLogger({ label: 'contentstack' });
        this.logger.info(`Webhook URL: ${webhookUrl}`);
        this.contentStackClient = new ContentStackClient({
            apiKey: this.apiKey,
            managementToken: this.managementToken,
            logger: this.logger,
        });
        this.cache = cache;

        if (webhookUrl) {
            const isConfigured = await this.contentStackClient.isWebhookConfigured(webhookUrl);
            if (isConfigured) {
                this.logger.info('Webhook already registered');
            } else {
                const webhook = await this.contentStackClient.createWebhook(webhookUrl);
                this.logger.info(`Registered webhook -> ${webhookUrl}`);
            }
        }
    }

    async reset(): Promise<void> { }

    async getModels(): Promise<ContentSourceTypes.Model[]> {
        const [globalFields, itemTypes] = await Promise.all([this.contentStackClient.getGlobalFields(), this.contentStackClient.getItemTypes()]);

        const objects = globalFields.items
            .map((item) => convertSchema(item as unknown as ContentStackModel, true))
            .flat();

        const data = _.flatten(
            itemTypes.items.map((item) => convertSchema(item as unknown as ContentStackModel, false))
        ).flat();

        const models = [...objects, ...data];

        const modelsWithReference = models
            .filter((model) => model?.context?.reference)
            .map((model) => ({
                name: model.name,
                label: model.label,
                reference: model.context?.reference,
            }));

        if (modelsWithReference.length > 0) {
            const mapping = _.keyBy(models, 'name');

            modelsWithReference.forEach((modelWithReference) => {
                const index = models.findIndex((model) => model.name === modelWithReference.name);
                models[index] = {
                    ...(mapping[modelWithReference.reference] as ContentSourceTypes.Model),
                    name: modelWithReference.name,
                    label: modelWithReference.label,
                };
            });
        }

        return models;
    };

    async getSchema(): Promise<ContentSourceTypes.Schema<SchemaContext>> {
        const [models, locales] = await Promise.all([this.getModels(), this.getLocales()]);

        return {
            context: {},
            models,
            locales,
        };
    }

    async getLocales(): Promise<ContentSourceTypes.Locale[]> {
        return [];
    }

    async getDocuments(): Promise<ContentSourceTypes.Document<DocumentContext>[]> {
        const { models } = this.cache.getSchema();
        const modelMap = _.keyBy(models, 'name');

        const documentTypes = models
            .filter((model) => ['data', 'page'].includes(model.type))
            .map((model) => model.name);

        const documents = await Promise.all(documentTypes.map((documentType) => this.getDocumentsByContentType(documentType, modelMap)))

        return _.flatten(documents);
    }

    async getDocumentsByContentType(contentType: string, modelMap: ContentSourceTypes.ModelMap) {
        const documents = await this.contentStackClient.getItems(contentType);

        return documents.map((document) =>
            transformDocument(
                document,
                this.cache.getModelByName(contentType)!,
                modelMap,
                { apiKey: this.apiKey }
            ) as ContentSourceTypes.Document<DocumentContext>
        );
    }

    async getAssets(): Promise<ContentSourceTypes.Asset<AssetContext>[]> {
        const assets = await this.contentStackClient.getAssets();

        return assets.map((asset) => transformAsset<AssetContext>(asset, { apiKey: this.apiKey }));
    }

    async hasAccess(options: { userContext?: UserContext }): Promise<{
        hasConnection: boolean;
        hasPermissions: boolean;
    }> {
        return {
            hasConnection: true,
            hasPermissions: true,
        };
    }

    async createDocument(options: {
        updateOperationFields: Record<string, ContentSourceTypes.UpdateOperationField>;
        model: ContentSourceTypes.Model;
        locale?: string;
        defaultLocaleDocumentId?: string;
        userContext?: UserContext;
    }): Promise<{ documentId: string }> {
        const { models } = this.cache.getSchema();
        const modelMap = _.keyBy(models, 'name');

        const rawDocument = await this.contentStackClient.createDocument(options.model, options.updateOperationFields, this.cache.getDocumentById, modelMap);
        
        return {
            documentId: rawDocument.uid,
        };
    }

    async updateDocument(options: {
        document: ContentSourceTypes.Document<DocumentContext>;
        operations: ContentSourceTypes.UpdateOperation[];
        userContext?: UserContext;
    }): Promise<void> {
        const { document, operations } = options;
        const { models } = this.cache.getSchema();
        const modelMap = _.keyBy(models, 'name');

        await this.contentStackClient.updateDocument(document, operations, modelMap, this.cache.getDocumentById);
    }

    async deleteDocument(options: {
        document: ContentSourceTypes.Document<unknown>;
        userContext?: UserContext;
    }): Promise<void> {
        await this.contentStackClient.deleteDocument(options.document.modelName, options.document.id);
    }

    async uploadAsset(options: {
        url?: string | undefined;
        base64?: string | undefined;
        fileName: string;
        mimeType: string;
        locale?: string | undefined;
        userContext?: UserContext;
    }): Promise<ContentSourceTypes.Asset<AssetContext>> {
        const tempName = `${uuidv4()}-${options.fileName}`;

        if (options.base64) {
            writeFileSync(tempName, Buffer.from(options.base64, 'base64'));
        } else {
            await downloadFile(options.url!, tempName);
        }

        const asset = await this.contentStackClient.uploadImage(tempName, options.fileName) as ExtendedAsset;
        unlinkSync(tempName);

        return transformAsset<AssetContext>(asset, { apiKey: this.apiKey })
    }

    async validateDocuments(options: {
        documents: ContentSourceTypes.Document<unknown>[];
        assets: ContentSourceTypes.Asset<unknown>[];
        locale?: string | undefined;
        userContext?: UserContext;
    }): Promise<{ errors: ContentSourceTypes.ValidationError[] }> {
        let validations: ContentSourceTypes.ValidationError[] = [];
        return { errors: validations };
    }

    async publishDocuments(options: {
        documents: ContentSourceTypes.Document<DocumentContext>[];
        assets: ContentSourceTypes.Asset<AssetContext>[];
        userContext?: UserContext;
    }): Promise<void> {
        await this.contentStackClient.publishDocuments(options.documents);
    }

    onWebhook(data: { data: WebhookPayload; headers: Record<string, string> }): void {
        const { event, module, data: itemData } = data.data;
        const { models } = this.cache.getSchema();

        const modelMap = _.keyBy(models, 'name');

        const updates: ContentSourceTypes.ContentChanges<DocumentContext, AssetContext> = {
            assets: [],
            documents: [],
            deletedDocumentIds: [],
            deletedAssetIds: [],
        };

        if (module === 'entry') {
            const {
                entry,
                content_type: { uid: modelName },
            } = itemData;
            if (event === 'delete') {
                updates.deletedDocumentIds?.push(entry.uid);
            } else if (['create', 'update', 'publish', 'unpublish'].includes(event)) {
                const transformedDocument = transformDocument(
                    entry,
                    modelMap[modelName]!,
                    modelMap,
                    { apiKey: this.apiKey }
                );

                updates.documents?.push(transformedDocument as ContentSourceTypes.Document<DocumentContext>);
            }
        } else if (module === 'asset') {
            const { asset } = itemData;
            if (event === 'delete') {
                updates.deletedAssetIds?.push(asset.uid);
            } else if (['create', 'update', 'publish', 'unpublish'].includes(event)) {
                const transformedAsset = transformAsset(asset, { apiKey: this.apiKey });
                updates.assets?.push(transformedAsset as ContentSourceTypes.Asset<AssetContext>);
            }
        } else if (module === 'content_type' || module === 'global_field') {
            this.cache.invalidateSchema();
            return;
        }

        this.logger.debug('Received updates: ' + JSON.stringify(updates, null, 2));
        this.cache.updateContent(updates);
    }
}
