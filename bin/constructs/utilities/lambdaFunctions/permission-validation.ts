import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { OnEventRequest, OnEventResponse } from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';
import { retryAsync } from 'ts-retry';

const CLIENT_TIMEOUT_MS = 10000;
const CLIENT_MAX_RETRIES = 5;

const RETRY_CONFIG = {
    delay: 30000, // 30 seconds
    maxTry: 20, // Maximum of 20 retries (approximately 10 minutes)
};

/**
 * Creates an OpenSearch client with the provided configuration.
 * @param collectionEndpoint - The endpoint of the OpenSearch collection.
 * @returns The configured OpenSearch client.
 */
function createOpenSearchClient(collectionEndpoint: string): Client {
    const signerResponse = AwsSigv4Signer({
        region: process.env.AWS_REGION!,
        service: 'aoss',
        getCredentials: defaultProvider(),
    });

    return new Client({
        ...signerResponse,
        maxRetries: CLIENT_MAX_RETRIES,
        node: collectionEndpoint,
        requestTimeout: CLIENT_TIMEOUT_MS,
    });
}

/**
 * Checks if the OpenSearch index exists and retries the operation if it fails initially.
 * @param openSearchClient - The OpenSearch client to use for the index existence check.
 * @param indexName - The name of the OpenSearch index to check.
 * @returns A promise that resolves if the index exists, or rejects with an error if the index is not found after retries.
 */
async function checkIndexExists(openSearchClient: Client, indexName: string): Promise<void> {
    try {
        await retryAsync(
            async () => {
                const result = await openSearchClient.indices.exists({ index: indexName });
                const statusCode = result.statusCode;

                if (statusCode === 404) {
                    throw new Error('Index not found');
                } else if (statusCode === 200) {
                    console.log('OpenSearch Serverless Index found');
                } else {
                    throw new Error(`Unknown error while looking for index: ${JSON.stringify(result)}`);
                }
            },
            RETRY_CONFIG,
        );
    } catch (error) {
        throw new Error(`Failed to check for index: ${error}`);
    }
}



/**
 * Handles the 'Create', 'Update', and 'Delete' events for a custom resource.
 * @param event - The request object containing the event type and request variables.
 * @param _context - The Lambda context object (unused).
 * @returns A response object containing the physical resource ID.
 */
export const onEvent = async (event: OnEventRequest, _context: unknown): Promise<OnEventResponse> => {
    const { indexName, collectionEndpoint } = event.ResourceProperties;

    try {
        const openSearchClient = createOpenSearchClient(collectionEndpoint);

        if (event.RequestType === 'Create' || event.RequestType === 'Update') {
            console.log('Validating permissions to access index');
            await checkIndexExists(openSearchClient, indexName);
        } else if (event.RequestType === 'Delete') {
            // console.log('Deleting index');
            // await deleteIndex(openSearchClient, indexName);
            // Index deletion is taken care of in aoss-index-operation.ts
            return { PhysicalResourceId: event.PhysicalResourceId };
        } else {
            throw new Error(`Unsupported request type: ${event.RequestType}`);
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }

    console.log('Index validation successful');
    return { PhysicalResourceId: `osindex_${indexName}` };
};

/**
 * Deletes the specified OpenSearch index and retries the operation if it fails initially.
 * @param openSearchClient - The OpenSearch client to use for deleting the index.
 * @param indexName - The name of the OpenSearch index to delete.
 * @returns A promise that resolves if the index is deleted, or rejects with an error if the deletion fails after retries.
 */
async function deleteIndex(openSearchClient: Client, indexName: string): Promise<void> {
    try {
        await retryAsync(
            async () => {
                const result = await openSearchClient.indices.delete({ index: indexName });
                const statusCode = result.statusCode;

                if (statusCode === 404) {
                    console.log('Index not found, skipping deletion');
                } else if (statusCode === 200) {
                    console.log('Index deleted successfully');
                } else {
                    throw new Error(`Unknown error while deleting index: ${JSON.stringify(result)}`);
                }
            },
            // RETRY_CONFIG,
        );
    } catch (error) {
        throw new Error(`Failed to delete index: ${error}`);
    }
}