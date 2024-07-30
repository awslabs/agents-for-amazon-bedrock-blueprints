import { BedrockAgentClient, StartIngestionJobCommand, StartIngestionJobCommandOutput } from "@aws-sdk/client-bedrock-agent";
import { OnEventRequest, OnEventResponse } from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';
import { Logger } from '@aws-lambda-powertools/logger';
const logger = new Logger({
    serviceName: 'BedrockAgentsBlueprints',
    logLevel: "INFO"
});

/**
 * OnEvent is called to create/update/delete the custom resource. We are only using it
 * here to start a one-off ingestion job at deployment.
 *
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requests.html
 *
 * @param event request object containing event type and request variables. This contains 2
 * params: knowledgeBaseId(Required), dataSourceId(Required)
 * @param _context Lambda context, currently unused.
 *
 * @returns reponse object containing the physical resource ID of the ingestionJob.
 */
export const onEvent = async (event: OnEventRequest, _context: unknown): Promise<OnEventResponse> => {
    if (event.RequestType != 'Create') return { PhysicalResourceId: 'skip' };

    const { knowledgeBaseId, dataSourceId } = event.ResourceProperties;

    const brAgentClient = new BedrockAgentClient({});
    let dataSyncResponse: StartIngestionJobCommandOutput | undefined;
    try {
        // Start Knowledgebase and datasource sync job
        logger.info('Starting ingestion job');
        dataSyncResponse = await brAgentClient.send(
            new StartIngestionJobCommand({
                knowledgeBaseId,
                dataSourceId,
            }),
        );

        return {
            PhysicalResourceId: dataSyncResponse && dataSyncResponse.ingestionJob
                ? `datasync_${dataSyncResponse.ingestionJob.ingestionJobId}`
                : 'datasync_failed',
        };
    } catch (err) {
        logger.error((err as Error).toString());
        return {
            PhysicalResourceId: 'datasync_failed',
            Reason: `Failed to start ingestion job: ${err}`,
        };
    }
};