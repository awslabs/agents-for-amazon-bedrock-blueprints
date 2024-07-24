// Refactored the original code for better readability 
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { OnEventRequest, OnEventResponse } from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';
import { retryAsync } from 'ts-retry';

const CLIENT_TIMEOUT_MS = 1000;
const CLIENT_MAX_RETRIES = 5;
const CREATE_INDEX_RETRY_CONFIG = {
    delay: 30000,  // 30 seconds
    maxTry: 20,   // Maximum of 20 retries (approximately 10 minutes)
};

// TODO: make an embedding to config map to support more models
// Default config for titan embedding v2. Derived from https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html
const DEFAULT_INDEX_CONFIG = {
    mappings: {
        properties: {
            id: {
                type: 'text',
                fields: {
                    keyword: {
                        type: 'keyword',
                        ignore_above: 256,
                    },
                },
            },
            AMAZON_BEDROCK_METADATA: {
                type: 'text',
                index: false,
            },
            AMAZON_BEDROCK_TEXT_CHUNK: {
                type: 'text',
            },
            'bedrock-knowledge-base-default-vector': {
                type: 'knn_vector',
                dimension: 1536,
                method: {
                    engine: 'faiss',
                    space_type: 'l2',
                    name: 'hnsw',
                },
            },
        },
    },
    settings: {
        index: {
            number_of_shards: 2,
            'knn.algo_param': {
                ef_search: 512,
            },
            knn: true,
        },
    },
};

/**
 * Creates an OpenSearch client with the provided configuration.
 * @param collectionEndpoint - The endpoint of the OpenSearch collection.
 * @returns The configured OpenSearch client.
 */
function createOpenSearchClient(collectionEndpoint: string): Client {
    console.log('Creating OpenSearch client...');
    const signerResponse = AwsSigv4Signer({
        region: process.env.AWS_REGION!,
        service: 'aoss',
        getCredentials: defaultProvider(),
    });

    const openSearchClient = new Client({
        ...signerResponse,
        maxRetries: CLIENT_MAX_RETRIES,
        node: collectionEndpoint,
        requestTimeout: CLIENT_TIMEOUT_MS,
    });

    console.log('OpenSearch client created successfully');
    return openSearchClient;
}

/**
 * Creates a new OpenSearch index with the provided configuration.
 * @param openSearchClient - The OpenSearch client to use for index creation.
 * @param indexName - The name of the OpenSearch index to create.
 * @param indexConfig - The optional index configuration to use (defaults to DEFAULT_INDEX_CONFIG).
 * @returns A promise that resolves with the physical resource ID of the created index.
 */
async function createIndex(openSearchClient: Client, indexName: string, indexConfig?: any): Promise<OnEventResponse> {
    console.log(`Starting AOSS index creation for index: ${indexName}`);

    // Create index based on default or user-provided config.
    const indexConfiguration = indexConfig ?? DEFAULT_INDEX_CONFIG;
    console.log('Using index configuration:', indexConfiguration);

    // Retry index creation to allow data policy to propagate.
    await retryAsync(
        async () => {
            console.log(`Attempting to create index: ${indexName}`);
            await openSearchClient.indices.create({
                index: indexName,
                body: indexConfiguration,
            });
            console.log(`Successfully created index: ${indexName}`);
        },
        CREATE_INDEX_RETRY_CONFIG,
    );

    console.log(`Index creation completed for index: ${indexName}`);
    return {
        PhysicalResourceId: `osindex_${indexName}`,
    };
}

/**
 * Deletes an existing OpenSearch index, or gracefully exits if the index doesn't exist.
 * @param openSearchClient - The OpenSearch client to use for index deletion.
 * @param indexName - The name of the OpenSearch index to delete.
 * @returns A promise that resolves with the physical resource ID of the deleted index, or 'skip' if the index doesn't exist.
 */
async function deleteIndex(openSearchClient: Client, indexName: string): Promise<OnEventResponse> {
    console.log(`Starting AOSS index deletion for index: ${indexName}`);

    try {
        await openSearchClient.indices.delete({
            index: indexName,
        });
        console.log(`Successfully deleted index: ${indexName}`);
        return {
            PhysicalResourceId: `osindex_${indexName}`,
        };
    } catch (error: unknown) {
        const typedError = error as { status?: number; error?: { root_cause?: any[] } };
        if (typedError.status === 404) {
            const rootCause = typedError.error?.root_cause || [];
            const indexNotFoundError = rootCause.find(
                (cause: any) => cause.type === 'index_not_found_exception'
            );
            if (indexNotFoundError) {
                console.log(`Index ${indexName} does not exist, skipping deletion.`);
                return {
                    PhysicalResourceId: `osindex_${indexName}`,
                };
            }
        }
        console.error(`An error occurred during index deletion: ${error}`);
        throw error;
    }
}

// catch (error) {
//     if (error instanceof Error) {
//         if (error.message.includes('index_not_found_exception')) {
//             console.log(`Index ${indexName} does not exist, skipping deletion.`);
//             return {
//                 PhysicalResourceId: `osindex_${indexName}`,
//             };
//         } else
//             throw error;
//             console.log(`An error occurred during index deletion: ${error}`);

//     } else {
//         console.error(`Failed to delete index: ${error}`);
//         throw error;
//     }
// }
// }

/**
 * Updates an existing OpenSearch index by deleting and recreating it with the provided configuration.
 * @param openSearchClient - The OpenSearch client to use for index update.
 * @param indexName - The name of the OpenSearch index to update.
 * @param indexConfig - The optional index configuration to use (defaults to DEFAULT_INDEX_CONFIG).
 * @returns A promise that resolves with the physical resource ID of the updated index.
 */
async function updateIndex(openSearchClient: Client, indexName: string, indexConfig?: any): Promise<OnEventResponse> {
    console.log(`Starting AOSS index update for index: ${indexName}`);
    // OpenSearch doesn't have an update index function. Hence, delete and create index.
    await deleteIndex(openSearchClient, indexName);
    console.log(`Deleted index: ${indexName} for update operation`);
    return await createIndex(openSearchClient, indexName, indexConfig);
}

/**
 * OnEvent is called to create/update/delete the custom resource.
 *
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requests.html
 *
 * @param event - Request object containing event type and request variables (indexName, collectionEndpoint, indexConfiguration).
 * @param _context - Lambda context (unused).
 * @returns Response object containing the physical resource ID of the indexName.
 */
export const onEvent = async (event: OnEventRequest, _context: unknown): Promise<OnEventResponse> => {
    const { indexName, collectionEndpoint, indexConfiguration } = event.ResourceProperties;
    console.log(`Received event: ${event.RequestType} for index: ${indexName}`);

    try {
        console.log('Initiating custom resource for index operations');
        const openSearchClient = createOpenSearchClient(collectionEndpoint);

        switch (event.RequestType) {
            case 'Create':
                return await createIndex(openSearchClient, indexName, indexConfiguration);
            case 'Update':
                return await updateIndex(openSearchClient, indexName, indexConfiguration);
            case 'Delete':
                return await deleteIndex(openSearchClient, indexName);
            default:
                throw new Error(`Unsupported request type: ${event.RequestType}`);
        }
    } catch (error) {
        console.error(`Custom resource aoss-index operation failed: ${error}`);
        throw error;
    }
};
