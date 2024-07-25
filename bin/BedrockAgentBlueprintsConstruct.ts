import { Fn, StackProps, aws_bedrock as bedrock } from 'aws-cdk-lib';
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { v4 as uuidv4 } from 'uuid';
import { AgentActionGroup, SchemaDefinition } from './constructs/AgentActionGroup';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { FileBufferMap, writeFilesToDir } from "./constructs/utilities/utils";

import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { AgentKnowledgeBase } from './constructs/AgentKnowledgeBase';
import { MAX_KB_SUPPORTED } from './constructs/utilities/constants';

export interface BedrockAgentBlueprintsConstructProps extends StackProps {
    agentDefinition: bedrock.CfnAgentProps;
    actionGroups?: AgentActionGroup[];
    knowledgeBases?: AgentKnowledgeBase[];
    guardrail?: bedrock.CfnGuardrail;
}

export class BedrockAgentBlueprintsConstruct extends Construct {
    public agent: bedrock.CfnAgent;
    public agentDefinition: bedrock.CfnAgentProps;
    public agentServiceRole: Role;
    private assetManagementBucket: Bucket;
    constructor(scope: Construct, id: string, props: BedrockAgentBlueprintsConstructProps) {
        super(scope, id);
        this.agentDefinition = props.agentDefinition;

        // Check if we need to setup an S3 bucket to store assets.
        if (this.checkActionsRequireArtifacts(props.actionGroups) || this.checkKBSetupRequired(props.knowledgeBases)) {
            this.assetManagementBucket = this.setupS3Bucket();
        }

        this.associateActionGroupInfo(props.actionGroups);
        this.associateKnowledgeBaseInfo(props.knowledgeBases);
        this.associateGuardrailInfo(props.guardrail);
        this.createBedrockAgent();

        // Allow bedrock agent to invoke the functions
        this.addResourcePolicyForActions(props.actionGroups);
    }

    /** Agent functions */

    private createBedrockAgent() {
        // Check if role is provided else create a role
        if (!this.agentDefinition.agentResourceRoleArn) {
            this.agentServiceRole = this.setupIAMRole();
        }
        this.agent = new bedrock.CfnAgent(this, `AgentBlueprint-${this.agentDefinition.agentName}`, this.agentDefinition);
    }

    /**
     * Create an IAM Service role for the agent to use to access FM, Artifacts, Actions and KB.
     * @returns IAM Role with required permissions.
     */
    private setupIAMRole(): Role {
        const region = process.env.CDK_DEFAULT_REGION!;
        const accountId = process.env.CDK_DEFAULT_ACCOUNT!;
        // Setup service role that allows bedrock to assume this role
        const bedrockServiceRole = new Role(this, 'BedrockServiceRole', {
            assumedBy: new ServicePrincipal('bedrock.amazonaws.com', {
                conditions: {
                    StringEquals: {
                        'aws:SourceAccount': accountId,
                    },
                },
            }),
            roleName: `AmazonBedrockExecutionRoleForAgents_${uuidv4().slice(0, 12)}`,
            description: 'Service role for Amazon Bedrock',
        });

        // Attach the necessary model invocation permission
        const modelUsed = this.agentDefinition.foundationModel;
        bedrockServiceRole.addToPolicy(
            new PolicyStatement({
                sid: 'AllowModelInvocationForOrchestration',
                effect: Effect.ALLOW,
                actions: ['bedrock:InvokeModel'],
                resources: [
                    `arn:aws:bedrock:${region}::foundation-model/${modelUsed}`,
                ],
            })
        );

        // Recreate the agentDefinition with the new Role created.
        this.agentDefinition = {
            ...this.agentDefinition,
            agentResourceRoleArn: bedrockServiceRole.roleArn,
        };

        return bedrockServiceRole;

    }

    /** KnowledgeBase functions */

    private checkKBSetupRequired(knowledgeBases: AgentKnowledgeBase[] | undefined): boolean {
        if (knowledgeBases) {
            return !(this.node.tryGetContext("skipKBCreation") === "true");
        }
        return false;
    }

    private validateKB(kbs: AgentKnowledgeBase[] | undefined) {
        //Validate if we can support the amount of KBs attached.
        if (kbs && kbs.length > MAX_KB_SUPPORTED) throw new Error(`Maximum supported KnowledgeBases: ${MAX_KB_SUPPORTED}`);

        // ...Add other validation here if needed.
    }

    /**
     * Adds a policy statement to the agent service role, granting the necessary permissions
     * to retrieve and generate content from the specified Bedrock knowledge base.
     *
     * @param knowledgeBaseId - The ID of the Bedrock knowledge base to grant access to.
     */
    private addKBInvocationAccess(knowledgeBaseId: string) {
        const accountId = process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.CDK_DEFAULT_REGION!;

        // Attach permission to read from KB
        this.agentServiceRole?.addToPolicy(
            new PolicyStatement({
                sid: 'QueryAssociatedKnowledgeBases',
                effect: Effect.ALLOW,
                actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
                resources: [`arn:aws:bedrock:${region}:${accountId}:knowledge-base/${knowledgeBaseId}`],
            })
        );
    }

    /**
     * Associates the provided knowledge bases with the agent definition.
     *
     * For each knowledge base, it performs the following steps:
     *
     * 1. Checks if the `assetFiles` property is defined. If not, it throws an error.
     * 2. Calls the `deployAssetsToBucket` method to upload the asset files to S3.
     * 3. Calls the `createAndSyncDataSource` method on the knowledge base to create 
     * and sync the data source.
     * 4. Creates an `AgentKnowledgeBaseProperty` object with the knowledge base ID 
     * and description, and adds it to the `kbDefinitions` array.
     * 5. Calls the `addKBInvocationAccess` method to grant the agent the necessary 
     * permissions to retrieve and generate content from the knowledge base.
     *
     * @param knowledgeBases - An array of `AgentKnowledgeBase` objects to associate with the agent definition
     */
    private associateKnowledgeBaseInfo(knowledgeBases: AgentKnowledgeBase[] | undefined) {
        // Early return if kb is falsy (undefined or null) or user opted out for KB creation.
        if (!this.checkKBSetupRequired(knowledgeBases)) return;
        this.validateKB(knowledgeBases);
        let kbDefinitions: bedrock.CfnAgent.AgentKnowledgeBaseProperty[] = [];

        knowledgeBases?.forEach(kb => {
            if (!kb.assetFiles) throw new Error(`No asset files were provided for KnowledgeBase: ${kb.knowledgeBaseName}`);

            const deploymentInfo = this.deployAssetsToBucket(kb.assetFiles, kb.knowledgeBaseName);
            kb.createAndSyncDataSource(deploymentInfo.deployedBucket.bucketArn, kb.knowledgeBaseName);
            kbDefinitions.push({
                knowledgeBaseId: kb.knowledgeBase.attrKnowledgeBaseId,
                description: kb.agentInstruction
            });

            this.addKBInvocationAccess(kb.knowledgeBase.attrKnowledgeBaseId);
        });

        // Append the knowledgeBases to the agent definition.
        this.agentDefinition = {
            ...this.agentDefinition,
            knowledgeBases: kbDefinitions
        };
    }

    /** Action group functions */

    /**
     * Check if any of the action requires a file to be uploaded. aka if any action
     * has a schemaFile attribute set.
     * 
     * @param actionGroups list of actions groups attached to the agent.
     * @returns true if artifact upload is required, false otherwise.
     */
    private checkActionsRequireArtifacts(actionGroups: AgentActionGroup[] | undefined): boolean {
        return actionGroups?.some(action => action.schemaDefinition.apiSchemaFile) ?? false;
    }

    /**
     * Associates the provided action groups with the agent definition.
     * @param actionGroups For each action group, it creates an `AgentActionGroupProperty` object.
     * If the API schema is provided as a file buffer, it uploads to S3 and stores reference.
     * @returns void
     */
    private associateActionGroupInfo(actionGroups: AgentActionGroup[] | undefined) {
        if (!actionGroups) return;

        const agentActionGroups: bedrock.CfnAgent.AgentActionGroupProperty[] = actionGroups.map(action => {
            return {
                actionGroupName: action.actionGroupName,
                actionGroupExecutor: action.getActionExecutor(),
                description: action.description,
                actionGroupState: action.actionGroupState,
                ...this.getApiSchema(action.schemaDefinition, action.actionGroupName),
            };
        });

        // Initialize with an empty array if undefined, <[]> helps transform it to a generic Array
        const existingActions = <[]>this.agentDefinition?.actionGroups || [];

        // Append the agentActionGroups to the agent definition.
        this.agentDefinition = {
            ...this.agentDefinition,
            actionGroups: [
                ...existingActions,
                ...agentActionGroups
            ],
        };
    }

    /**
     * Retrieves the API/Function schema based on the schema definition.
     *
     * @param schemaDefinition - The schema definition containing the API schema information.
     * @param actionGroupName - The name of the action group.
     * @returns An object containing either the inline API schema, the S3 location of the API schema file, or the function schema.
     * @throws {Error} If neither an OpenAPI schema nor a function schema is provided in the schema definition.
     */
    private getApiSchema(schemaDefinition: SchemaDefinition, actionGroupName: string) {
        if (schemaDefinition.inlineAPISchema) {
            return {
                apiSchema: {
                    payload: schemaDefinition.inlineAPISchema
                }
            };
        } else if (schemaDefinition.apiSchemaFile) {
            return {
                apiSchema: {
                    s3: this.uploadSchemaToS3(schemaDefinition.apiSchemaFile, actionGroupName)
                }
            };
        } else if (schemaDefinition.functionSchema) {
            return { functionSchema: schemaDefinition.functionSchema };
        } else {
            throw new Error('OpenAPI schema or functionDefinition schema required for creating action group');
        }
    }

    /**
     * Adds a resource policy to the Lambda functions associated with the provided action groups,
     * The permission allows the 'bedrock.amazonaws.com' service principal to invoke the Lambda 
     * function, using the agent's ARN as the source ARN.
     *
     * This ensures that the Bedrock service can invoke the Lambda functions associated with the
     * agent's action groups.
     *
     * @param actionGroups - An array of `AgentActionGroup` objects, or `undefined` 
     * if there are no action groups.
     */
    private addResourcePolicyForActions(actionGroups: AgentActionGroup[] | undefined) {
        // Early return if actionGroups is falsy (undefined or null)
        if (!actionGroups) return;

        actionGroups.forEach(action => {
            const permissionName = `BedrockAgentInvokePermission-${uuidv4().slice(0, 12)}`;
            action.lambdaFunc?.addPermission(permissionName, {
                action: 'lambda:InvokeFunction',
                principal: new ServicePrincipal('bedrock.amazonaws.com'),
                sourceArn: this.agent.attrAgentArn
            });
        });
    }

    /**
     * Attach permission to read OpenAPI schema from S3 to the Agent service role
     * if it is created by the construct.
     * 
     * @param s3ArtifactArn  ARN of the S3 bucket and folder containing the OpenAPI schema
     * 
     * @returns void
     */
    private addSchemaAccessForAgents(s3ArtifactArn: string) {
        if (!this.agentServiceRole) return; //Nothing to do if role isn't setup by construct.

        const accountId = process.env.CDK_DEFAULT_ACCOUNT!;
        this.agentServiceRole.addToPolicy(
            new PolicyStatement({
                sid: 'AllowAccessToActionGroupAPISchemas',
                effect: Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: [s3ArtifactArn],
                conditions: {
                    StringEquals: {
                        'aws:ResourceAccount': accountId,
                    },
                },
            })
        );

    }

    /** S3 asset management bucket functions */

    private setupS3Bucket() {
        const logBucket = new Bucket(this, `AgentBlueprintAssetsAccessLogs-${uuidv4().slice(0, 4)}`, {
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        });

        return new Bucket(this, `AgentBlueprintAssets-${uuidv4().slice(0, 12)}`, {
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            serverAccessLogsBucket: logBucket, // Accesslogging bucket
            serverAccessLogsPrefix: 'logs/',
            versioned: true, // Enable versioning
        });
    }

    private deployAssetsToBucket(assetFiles: FileBufferMap, prefix: string): BucketDeployment {
        // Create a temporary directory to store the zip file
        const tempDir = mkdtempSync(join(tmpdir(), 'cdk-'));
        let bucketDeployment: BucketDeployment;

        try {
            // Create a zip file containing the provided files
            writeFilesToDir(tempDir, assetFiles);

            // Deploy the zip file to the S3 bucket using the BucketDeployment construct
            bucketDeployment = new BucketDeployment(this, `AssetDeployment-${prefix}`, {
                sources: [Source.asset(tempDir)],
                destinationBucket: this.assetManagementBucket,
                destinationKeyPrefix: prefix,
            });
        } finally {
            // TODO: Clean up the temporary zip file and directory
            // fs.rmdirSync(tempDir);
        }

        return bucketDeployment;
    }

    /**
     * Uploads the provided schema file to an S3 bucket and returns the S3 location information.
     *
     * This creates a `FileBufferMap` object with the schema file, using the
     * `OpenAPISchema_${actionGroupName}.json` as the key. It then calls the `deployAssetsToBucket`
     * method to upload the file to an S3 bucket.
     *
     * @param schemaFile - The schema file as a `Buffer`, or `undefined` if no schema file is provided.
     * @param actionGroupName - The name of the action group, used to construct the file name.
     * @returns An `S3IdentifierProperty` object with the S3 location information for the uploaded schema file.
     */
    private uploadSchemaToS3(schemaFile: Buffer | undefined, actionGroupName: string): bedrock.CfnAgent.S3IdentifierProperty {
        if (!schemaFile) return {};
        const fileBufferMap: FileBufferMap = {
            [`OpenAPISchema_${actionGroupName}.json`]: schemaFile,
        };
        const deploymentInfo = this.deployAssetsToBucket(fileBufferMap, actionGroupName);
        this.addSchemaAccessForAgents(`${deploymentInfo.deployedBucket.bucketArn}/${actionGroupName}`);
        return {
            s3BucketName: deploymentInfo.deployedBucket.bucketName,
            s3ObjectKey: Fn.select(0, deploymentInfo.objectKeys)
        };
    }

    /** Guardrails functions */

    /**
     * Associates the Guardrail information with the agent definition.
     *
     * @param guardrail - The Guardrail resource object.
     *
     * If a Guardrail resource is provided, the function updates the `agentDefinition`
     * object by adding a `guardrailConfiguration` property.
     */
    private associateGuardrailInfo(guardrail: bedrock.CfnGuardrail | undefined) {
        if (!guardrail) return;

        this.agentDefinition = {
            ...this.agentDefinition,
            guardrailConfiguration: {
                guardrailIdentifier: guardrail.attrGuardrailId,
                guardrailVersion: guardrail.attrVersion,
            }
        };
    }
}