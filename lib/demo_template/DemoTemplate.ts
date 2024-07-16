import * as cdk from 'aws-cdk-lib';
import { readFileSync } from 'fs';
import { resolve } from "path";
import { Construct } from 'constructs';
import { BedrockAgentBlueprintsConstruct } from '../../bin/BedrockAgentBlueprintsConstruct';
import { AgentDefinitionBuilder } from '../../bin/constructs/AgentDefinitionBuilder';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { AgentActionGroup } from '../../bin/constructs/AgentActionGroup';
import { AgentKnowledgeBase } from '../../bin/constructs/AgentKnowledgeBase';

export class DemoTemplateStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const agentDef = new AgentDefinitionBuilder(this, 'NewAgentDef', {})
            .withAgentName('NewFriendlyAgent')
            .withInstruction('nice new fun agent to do great things in code')
            .build();

        const inlineCode = Buffer.from(
            `
                exports.handler = async (event) => {
                    console.log('Hello from Lambda!');
                    return { message: 'Success!' };
                };
                `);

        const inlineSchema = `{
                    "openapi": "3.0.0",
                    "info": {
                        "title": "Insurance Claims Automation API",
                        "version": "1.0.0",
                        "description": "APIs for managing insurance claims by pulling a list of open claims, identifying outstanding paperwork for each claim, and sending reminders to policy holders."
                    },
                    "paths": {
                        "/claims": {
                            "get": {
                                "summary": "Get a list of all open claims",
                                "description": "Get the list of all open insurance claims. Return all the open claimIds.",
                                "operationId": "getAllOpenClaims",
                                "responses": {
                                    "200": {
                                        "description": "Gets the list of all open insurance claims for policy holders",
                                        "content": {
                                            "application/json": {
                                                "schema": {
                                                    "type": "array",
                                                    "items": {
                                                        "type": "object",
                                                        "properties": {
                                                            "claimId": {
                                                                "type": "string",
                                                                "description": "Unique ID of the claim."
                                                            },
                                                            "policyHolderId": {
                                                                "type": "string",
                                                                "description": "Unique ID of the policy holder who has filed the claim."
                                                            },
                                                            "claimStatus": {
                                                                "type": "string",
                                                                "description": "The status of the claim. Claim can be in Open or Closed state"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        }
                    }
                    }
                    `;

        const action = new AgentActionGroup(this, 'NewAction', {
            actionGroupName: 'DummyAction',
            description: 'Dummy action for dummy agent',
            actionGroupExecutor: {
                lambdaDefinition: {
                    lambdaCode: inlineCode,
                    lambdaHandler: 'index.handler',
                    lambdaRuntime: Runtime.NODEJS_18_X
                }
            },
            schemaDefinition: {
                inlineAPISchema: inlineSchema
            },
        });

        const fileBuffer: Buffer = readFileSync(resolve(__dirname, 'assets', 'dummy.csv'));

        const knowledgeBase = new AgentKnowledgeBase(this, 'NewKB', {
            kbName: 'DummyKB',
            agentInstruction: 'Dummy KB for dummy agent',
            assetFiles: [fileBuffer]
        });

        new BedrockAgentBlueprintsConstruct(this, 'AmazonBedrockAgentBlueprintsStack', {
            agentDefinition: agentDef,
            actionGroups: [action],
            knowledgeBases: [knowledgeBase],
        });
    }
}
