import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { OnEventRequest, OnEventResponse } from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';
import { retryAsync } from 'ts-retry';

const CLIENT_TIMEOUT_MS = 1000;
const CLIENT_MAX_RETRIES = 5;

const RETRY_CONFIG = {
    delay: 10000, //10 sec
    maxTry: 15, // Should wait atleast 2 mins for the permissions to propagate
};


/**
 * Handles the 'Create', 'Update', and 'Delete' events for a custom resource.
 *
 * This function checks the existence of an OpenSearch index and retries the operation if the index is not found,
 * with a configurable retry strategy.
 *
 * @param event - The request object containing the event type and request variables.
 *   - indexName (required): The name of the OpenSearch index to check.
 *   - collectionEndpoint (required): The endpoint of the OpenSearch collection.
 * @param _context - The Lambda context object. Unused currently.
 *
 * @returns - A response object containing the physical resource ID of the index name.
 *   - For 'Create' or 'Update' events, the physical resource ID is 'osindex_<indexName>'.
 *   - For 'Delete' events, the physical resource ID is 'skip'.
 */
export const onEvent = async (event: OnEventRequest, _context: unknown): Promise<OnEventResponse> => {
    const { indexName, collectionEndpoint } = event.ResourceProperties;

    try {
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

        if (event.RequestType == 'Create' || event.RequestType == 'Update') {
            // Validate permissions to access index
            await retryAsync(
                async () => {
                    let statusCode: null | number = 404;
                    let result = await openSearchClient.indices.exists({
                        index: indexName,
                    });
                    statusCode = result.statusCode;
                    if (statusCode === 404) {
                        throw new Error('Index not found');
                    }
                    else if (statusCode === 200) {
                        console.log('Successfully checked index!');
                    }
                    else {
                        throw new Error(`Unknown error while looking for index result opensearch response: ${JSON.stringify(result)}`);
                    }

                },
                RETRY_CONFIG,
            );
        }
        else {
            return { PhysicalResourceId: 'skip' };
        }
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check for index: ${error}`);
    }

    return {
        PhysicalResourceId: `osindex_${indexName}`,
    };
};