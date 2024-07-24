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


import { BedrockAgentClient, StartIngestionJobCommand, StartIngestionJobCommandOutput, DeleteDataSourceCommand, DeleteKnowledgeBaseCommand, UpdateDataSourceCommand, GetDataSourceCommand } from "@aws-sdk/client-bedrock-agent";
import { OnEventRequest, OnEventResponse } from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';

/**
 * Handles the creation, update, and deletion of a custom resource.
 * For the "Create" event, it starts a one-off ingestion job.
 * For the "Delete" event, it deletes the data source and knowledge base.
 *
 * @param event The request object containing the event type and request variables (knowledgeBaseId and dataSourceId).
 * @param _context The Lambda context, currently unused.
 * @returns The response object containing the physical resource ID and optional reason for failure.
 */
export const onEvent = async (event: OnEventRequest, _context: unknown): Promise<OnEventResponse> => {
    console.log("Received Event into Data Sync Function", JSON.stringify(event, null, 2));

    const brAgentClient = new BedrockAgentClient({});
    const { knowledgeBaseId, dataSourceId } = event.ResourceProperties;

    switch (event.RequestType) {
        case 'Create':
            return await handleCreateEvent(brAgentClient, knowledgeBaseId, dataSourceId);
        case 'Delete':
            return await handleDeleteEvent(brAgentClient, knowledgeBaseId, dataSourceId, event);
        default:
            return { PhysicalResourceId: 'skip' };
    }
};

/**
 * Handles the "Create" event by starting an ingestion job.
 *
 * @param brAgentClient The BedrockAgentClient instance.
 * @param knowledgeBaseId The ID of the knowledge base.
 * @param dataSourceId The ID of the data source.
 * @returns The response object containing the physical resource ID and optional reason for failure.
 */
const handleCreateEvent = async (brAgentClient: BedrockAgentClient, knowledgeBaseId: string, dataSourceId: string): Promise<OnEventResponse> => {
    try {
        const dataSyncResponse = await brAgentClient.send(
            new StartIngestionJobCommand({
                knowledgeBaseId,
                dataSourceId,
            }),
        );

        console.log("Data Sync Response", JSON.stringify(dataSyncResponse, null, 2));

        return {
            PhysicalResourceId: dataSyncResponse && dataSyncResponse.ingestionJob
                ? `datasync_${dataSyncResponse.ingestionJob.ingestionJobId}`
                : 'datasync_failed',
        };
    } catch (err) {
        console.error(err);
        return {
            PhysicalResourceId: 'datasync_failed',
            Reason: `Failed to start ingestion job: ${err}`,
        };
    }
};

/**
 * Handles the "Delete" event by deleting the data source and knowledge base.
 *
 * @param brAgentClient The BedrockAgentClient instance.
 * @param knowledgeBaseId The ID of the knowledge base.
 * @param dataSourceId The ID of the data source.
 * @returns The response object containing the physical resource ID and optional reason for failure.
 */
const handleDeleteEvent = async (brAgentClient: BedrockAgentClient, knowledgeBaseId: string, dataSourceId: string, event: OnEventRequest): Promise<OnEventResponse> => {
    try {
        // Retrieve the data source details
        const dataSourceResponse = await brAgentClient.send(
            new GetDataSourceCommand({
                dataSourceId,
                knowledgeBaseId,
            }),
        );

        const dataSource = dataSourceResponse.dataSource;
        console.log("DataSourceResponse DataSource", dataSource);

        // TODO: Check this in the logs and figure out the logic to change the data retention policy
        console.log("Full DataSourceResponse", dataSourceResponse)

        if (!dataSource) {
            throw new Error('Data source not found');
        }

        const { name, dataSourceConfiguration, vectorIngestionConfiguration } = dataSource;

        // // Update the dataDeletionPolicy to RETAIN
        // const policyChangeResponse = await brAgentClient.send(
        //     new UpdateDataSourceCommand({
        //         dataSourceId,
        //         knowledgeBaseId,
        //         dataDeletionPolicy: 'RETAIN',
        //         name,
        //         dataSourceConfiguration,
        //         vectorIngestionConfiguration,
        //     }),
        // );
        // console.log("Policy Change Response", policyChangeResponse)

        // // Send the update data source command to check if policy has been changed
        // let updatedDataSource = await brAgentClient.send(
        //     new GetDataSourceCommand({
        //         dataSourceId,
        //         knowledgeBaseId,
        //     }),
        // );
        // console.log("Updated DataSource", updatedDataSource)
        // console.log("Data Deletion Policy", updatedDataSource.dataSource?.dataDeletionPolicy)

        // const policyChangeResponseCheck = await brAgentClient.send(
        //     new UpdateDataSourceCommand({
        //         dataSourceId,
        //         knowledgeBaseId,
        //         name,
        //         dataSourceConfiguration,
        //         vectorIngestionConfiguration,
        //     }),
        // );
        // console.log("Policy Change Response Check", policyChangeResponseCheck)


        // Delete the data source
        const deleteDataSourceResponse = await brAgentClient.send(
            new DeleteDataSourceCommand({
                dataSourceId,
                knowledgeBaseId,
            }),
        );
        console.log("Delete DataSource Response", deleteDataSourceResponse)

        // Delete the knowledge base
        const deleteKBResponse = await brAgentClient.send(
            new DeleteKnowledgeBaseCommand({
                knowledgeBaseId,
            }),
        );
        console.log("Delete KB Response", deleteKBResponse)

        return {
            PhysicalResourceId: event.PhysicalResourceId,
        };
    } catch (err) {
        console.error(err);
        return {
            PhysicalResourceId: event.PhysicalResourceId,
            Reason: `Failed to delete data source or knowledge base: ${err}`,
        };
    }
};
