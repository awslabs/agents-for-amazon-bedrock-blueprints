import { CustomResource, Duration, Fn, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AgentActionGroup, SchemaDefinition } from "./action-group-configuration-construct";
import { AgentKnowledgeBase, AgentKnowledgeBaseProps } from "./knowledge-base-configuration-construct";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { v4 as uuidv4 } from 'uuid';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { MAX_KB_SUPPORTED } from "./utilities/constants";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { FileBufferMap, writeFilesToDir } from "./utilities/utils";
import { join, resolve } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Provider } from "aws-cdk-lib/custom-resources";

export interface BedrockAgentBlueprintsConstructProps extends StackProps {
    agentDefinition: bedrock.CfnAgentProps;
    actionGroups?: AgentActionGroup[]; // this will store lambda assets + instructions
    knowledgeBases?: AgentKnowledgeBase[]; // this will contain info for assets and KB
    guardrail?: bedrock.CfnGuardrail;
}

export class BedrockAgentBlueprintsConstruct extends Construct {
    assetManagementBucket: Bucket;
    agent: bedrock.CfnAgent;
    agentDefinition: bedrock.CfnAgentProps;
    agentServiceRole: Role;


    constructor(scope: Construct, id: string, props: BedrockAgentBlueprintsConstructProps) {
        super(scope, id);

        // Check if we need to setup an S3 bucket to store assets.
        if (this.checkActionsRequireArtifacts(props.actionGroups) || this.checkKBSetupRequired(props.knowledgeBases)) {
            this.assetManagementBucket = this.setupS3Bucket();
            // console.log("assetManagementBucket: ", this.assetManagementBucket.bucketName);
        }

        this.agentDefinition = props.agentDefinition;

        // Check if role is provided else create a role
        if (!this.agentDefinition.agentResourceRoleArn) {
            this.agentServiceRole = this.setupIAMRole();
        }
        // console.log("Agent definition before associating the KB", this.agentDefinition);

        // Associates the knowledgebases with agent definition
        this.associateKnowledgeBaseInfo(props.knowledgeBases);  // <-- addKBInvocationAccess is part of this method

        // Associates the action groups with the agent definition 
        this.associateActionGroupInfo(props.actionGroups);

        // Modified: Created a new method to associate Guardrails before creating the agent 
        this.associateGuardrailInfoBeforeCreatingAgent(props.guardrail)

        // console.log("Agent definition after associating the KB", this.agentDefinition);
        this.createBedrockAgent(); // <-- setupIAMRole used to be part of this method

        // Allow bedrock agent to invoke the functions
        this.addResourcePolicyForActions(props.actionGroups);

        // Attach guardrails to agent
        // this.associateGuardrailInfo(props.guardrail);
        // console.log("Agent definition after associating the guardrail", this.agentDefinition);

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
        // console.log("KB access added to agent service role", this.agentServiceRole);
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
            // console.log(`Deployment info for KB ${kb.knowledgeBaseName}:`, deploymentInfo);

            // AssetManagementBucket has been added to the kb object, allowing access within the AgentKnowledgeBase class. This enables its utilization during the creation of the knowledge base role.
            kb.assetManagementBucketName = deploymentInfo.deployedBucket.bucketName;

            kb.createAndSyncDataSource(deploymentInfo.deployedBucket.bucketArn, kb.knowledgeBaseName);
            kbDefinitions.push({
                knowledgeBaseId: kb.knowledgeBase.attrKnowledgeBaseId,
                description: kb.agentInstruction
            });

            // Grant the agent permissions to invoke the knowledgebase
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

        // Append the agentActionGroups to the agent definition.
        this.agentDefinition = {
            ...this.agentDefinition,
            actionGroups: [
                ...<[]>this.agentDefinition.actionGroups, // <[]> helps transform it to a generic Array
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

    // 
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

    /**
     * Creates an Amazon S3 bucket to store assets for the Amazon Bedrock agent knowledge base.
     * @returns The newly created S3 bucket.
     */
    private setupS3Bucket() {
        return new Bucket(this, `agent-knowledgebase-assets-${uuidv4().slice(0, 5)}`, {
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true
        });
    }


    /**
     * Deploys the provided asset files to the specified S3 bucket with the given prefix.
     *
     * @param assetFiles A map of file names to their contents (file buffers).
     * @param prefix The prefix to be used for the deployed files in the S3 bucket.
     * @returns The BucketDeployment construct used to deploy the assets.
     */
    private deployAssetsToBucket(assetFiles: FileBufferMap, prefix: string): BucketDeployment {
        // Create a temporary directory to store the zip file
        const tempDir = mkdtempSync(join(tmpdir(), 'cdk-'));
        let bucketDeployment: BucketDeployment;

        try {
            // Create a zip file containing the provided files
            writeFilesToDir(tempDir, assetFiles);

            // console.log("Zipping files for deployment...", tempDir);
            // console.log("S3 bucket for asset management: ", this.assetManagementBucket.bucketName);
            // console.log("Prefix:", prefix)
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

    /** Agent functions */

    private createBedrockAgent() {
        // // Check if role is provided else create a role
        // if (!this.agentDefinition.agentResourceRoleArn) {
        //     this.agentServiceRole = this.setupIAMRole();
        // }
        this.agent = new bedrock.CfnAgent(this, `AgentBlueprint-${this.agentDefinition.agentName}`, this.agentDefinition);
        // console.log("Agent definition after setting up full role: ", this.agentDefinition);

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

    // /** Guardrails functions */
    // private associateGuardrailInfo(guardrail: bedrock.CfnGuardrail | undefined) {
    //     if (!guardrail) return;

    //     // Create an execution role for the Lambda that needs to interact with Bedrock Agent to associate a Guardrail
    //     const lambdaExecutionRole = new Role(this, 'GuardrailsAssociationLambdaRole', {
    //         assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    //         managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    //         inlinePolicies: {
    //             AccessBedrockAgent: new PolicyDocument({            // < --AccessBedrockAgent inline policy grants necessary permissions to retrieve and update Agent's configuration 
    //                 statements: [
    //                     new PolicyStatement({
    //                         effect: Effect.ALLOW,
    //                         // Allows the role to
    //                         // 1. Retrieve info about the Bedrock Agent
    //                         // 2. Update the configuration of the Bedrock agent
    //                         actions: ["bedrock:GetAgent", "bedrock:UpdateAgent", "bedrock:PrepareAgent"],
    //                         resources: [this.agent.attrAgentArn],
    //                     }),
    //                 ],
    //             }),
    //         },
    //     });

    //     const onEventHandler = new NodejsFunction(this, 'GuardrailsAssociationFunc', {
    //         memorySize: 128,
    //         timeout: Duration.minutes(15),
    //         runtime: Runtime.NODEJS_18_X,
    //         handler: 'onEvent',
    //         // entry: path.resolve(__dirname, '..', '..', 'lib','utilities', 'lambdaFunctions', 'associate-guardrail.ts'),
    //         entry: resolve(__dirname, '..', '..', 'lib', 'lambda', '02-agent-with-kb-and-guardrails', 'cr-associate-guardrail.ts'),
    //         bundling: {
    //             nodeModules: ['@opensearch-project/opensearch', 'ts-retry'],
    //         },
    //         role: lambdaExecutionRole,
    //     });

    //     const provider = new Provider(this, 'GuardrailsAssociationProvider', {
    //         onEventHandler: onEventHandler,
    //     });

    //     // Custom Resource to update Agent Configuration to associate Guardrail
    //     return new CustomResource(this, 'GuardrailsAssociationCustomResource', {
    //         serviceToken: provider.serviceToken,
    //         properties: {                           // <-- these are the event.ResourceProperties read by Lambda
    //             agentId: this.agent.attrAgentId,
    //             guardrailVersion: guardrail.attrVersion,
    //             guardrailId: guardrail.attrGuardrailId,
    //         },
    //     });
    // }

    /**
     * Grants permission to the Amazon Bedrock agent service role to apply a specific guardrail.
     *
     * @param guardrailID The ID of the guardrail that the agent should be allowed to apply.
     */

    private addGuardrailAccess(guardrailID: string) {
        const accountId = process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.CDK_DEFAULT_REGION!;


        // Add necessary permissions to the agent service role
        this.agentServiceRole?.addToPolicy(
            new PolicyStatement({
                sid: 'AllowToApplyGuardrail',
                effect: Effect.ALLOW,
                actions: ['bedrock:ApplyGuardrail'],
                resources: [`arn:aws:bedrock:${region}:${accountId}:guardrail/${guardrailID}`],
            })
        );

        // Add necessary permissions to the agent service role to allow KMS encryption key decryption
        this.agentServiceRole?.addToPolicy(
            new PolicyStatement({
                sid: 'AllowKMSEncryptionKeyDecryption',
                effect: Effect.ALLOW,
                actions: ['kms:Decrypt'],
                resources: ['*'],  //TODO: Restrict to specific KMS key
                conditions: {
                    StringEquals: {
                        'aws:ResourceAccount': accountId,
                    },
                },
            })
        );
    }


    /**
     * Associates the provided guardrail information with the Amazon Bedrock agent before creating the agent.
     * This function adds the necessary permissions for the agent to apply the guardrail and appends the
     * guardrail configuration to the agent definition.
     *
     * @param guardrail The CloudFormation resource representing the guardrail to be associated with the agent.
     */

    private associateGuardrailInfoBeforeCreatingAgent(guardrail: bedrock.CfnGuardrail | undefined) {
        if (!guardrail) return;

        // Allow the Bedrock Agent to apply Guardrail
        this.addGuardrailAccess(guardrail.attrGuardrailId);

        // Append the guardrailDefinition to the agent definition
        this.agentDefinition = {
            ...this.agentDefinition,
            guardrailConfiguration: {
                guardrailIdentifier: guardrail.attrGuardrailId,
                guardrailVersion: guardrail.attrVersion,
            },
        };

    }
}


