import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { AgentActionGroup } from '../../../../agents-for-bedrock-blueprints/constructs/src/action-group-configuration-construct'
import { AgentDefinitionBuilder } from '../../../../agents-for-bedrock-blueprints/constructs/src/agent-definition-builder-construct'
import { AgentKnowledgeBase } from '../../../../agents-for-bedrock-blueprints/constructs/src/knowledge-base-configuration-construct'
import { BedrockAgentBlueprintsConstruct } from '../../../../agents-for-bedrock-blueprints/constructs/src/main-agent-blueprint-construct'
import { BedrockGuardrailsBuilder, FilterType, ManagedWordsTypes, PIIAction, PIIType } from '../../../../agents-for-bedrock-blueprints/constructs/src/guardrails-builder-construct';

import * as fs from 'fs';
import { isAbsolute, join, resolve } from "path";
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';

export class AgentWithKBandGuardrailsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const managedPolicies = [
            ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
        ];
        
        // Define the agent's properties
        const agentDef = new AgentDefinitionBuilder(this, 'KBAgent', {})
            .withAgentName('restaurant-assistant-agent-with-kb-and-guardrails')
            .withInstruction(
                'You are a restaurant agent, helping clients retrieve information from their booking, ' +
                'create a new booking or delete an existing booking'
            )
            .withFoundationModel('anthropic.claude-3-sonnet-20240229-v1:0')
            .withUserInput()
            .build();

        // Define the function schema for retrieving booking details
        const getBookingDetailsFunction = {
            'name': 'get_booking_details',
            'description': 'Retrieve details of a restaurant booking',
            'parameters': {
                'booking_id': {
                    'description': 'The ID of the booking to retrieve',
                    'required': true,
                    'type': 'string'
                }
            }
        }

        // Define the function schema for creating a new booking
        const createBookingFunction = {
            'name': 'create_booking',
            'description': 'Create a new restaurant booking',
            'parameters': {
                'date': {
                    'description': 'The date of the booking',
                    'required': true,
                    'type': 'string'
                },
                'name': {
                    'description': 'Name to idenfity your reservation',
                    'required': true,
                    'type': 'string'
                },
                'hour': {
                    'description': 'The hour of the booking',
                    'required': true,
                    'type': 'string'
                },
                'num_guests': {
                    'description': 'The number of guests for the booking',
                    'required': true,
                    'type': 'integer'
                }
            }
        }

        // Define the function schema for deleting a booking
        const deleteBookingFunction = {
            'name': 'delete_booking',
            'description': 'Delete an existing restaurant booking',
            'parameters': {
                'booking_id': {
                    'description': 'The ID of the booking to delete',
                    'required': true,
                    'type': 'string'
                }
            }
        }


        // Create Agent Action Group
        const tableBookingAction = new AgentActionGroup(this, 'TableBookingsActionGroup', {
            actionGroupName: 'TableBookingsActionGroup',
            description: 'Actions for getting table booking information, create a new booking or delete an existing booking',
            actionGroupExecutor: {
                lambdaDefinition: {
                    lambdaHandler: 'handler', 
                    lambdaRuntime: Runtime.NODEJS_18_X,
                    codeSourceType: 'asset',
                    fileName: 'agents-for-bedrock-usecase-examples/lib/lambda/03-agent-with-kb-and-guardrails/ag-table-booking-service.ts',
                    timeoutInMinutes: 4,
                    managedPolicies: managedPolicies,
                }

            },
            schemaDefinition: {
                functionSchema: {
                    functions: [getBookingDetailsFunction, createBookingFunction, deleteBookingFunction]
                }
            },
        });

        // Define the guardrail configuration
        const guardrail = new BedrockGuardrailsBuilder(this, "AgentGuardrail", {
            name: 'restaurant-assistant-guardrail',
            generateKmsKey: true, 
        })
            .withFiltersConfig(FilterType.INSULTS)
            .withManagedWordsConfig(ManagedWordsTypes.PROFANITY)
            .withWordsConfig(['competitor', 'confidential', 'proprietary'])
            .withPIIConfig(PIIAction.ANONYMIZE, PIIType.US_SOCIAL_SECURITY_NUMBER)
            .withTopicConfig("Avoid Religion", "Anything related to religion or religious topics", ['religion', 'faith', 'belief'])
            .build();

        // Read knowledge base files
        const { fileBuffers } = this.readMenuFiles('../assets/kb_documents');

        // Create the knowledge base
        const knowledgeBase = new AgentKnowledgeBase(this, 'BedrockDocs', {
            kbName: 'booking-agent-kb',
            agentInstruction: 'Access the knowledge base when customers ask about the plates in the menu.',
            assetFiles: fileBuffers
        });

        // Create the Bedrock Agent Blueprint
        new BedrockAgentBlueprintsConstruct(this, 'AgenticRAGStack', {
            agentDefinition: agentDef,
            actionGroups: [tableBookingAction],
            guardrail: guardrail,
            knowledgeBases: [knowledgeBase]
        });
    }

    // Method to read knowledge base files
    private readMenuFiles(filePath: string): { fileBuffer?: Buffer, fileBuffers?: Buffer[] } {
        let resolvedPath: string;
        resolvedPath = isAbsolute(filePath) ? filePath : join(__dirname, '..', filePath);
        console.log("Resolved path: ", resolvedPath)

        try {
            const stats = fs.statSync(resolvedPath);

            if (stats.isFile()) {
                // If the provided path is a file, read its contents
                const fileBuffer = fs.readFileSync(resolvedPath);
                return { fileBuffer };
            } else if (stats.isDirectory()) {
                // If the provided path is a directory, read all files in the directory
                const fileBuffers = fs.readdirSync(resolvedPath)
                    .map((fileName) => fs.readFileSync(join(resolvedPath, fileName)));
                return { fileBuffers };
            }
        } catch (err) {
            console.error(`Error reading files from ${resolvedPath}:`, err);
        }

        return {};
    }
}
