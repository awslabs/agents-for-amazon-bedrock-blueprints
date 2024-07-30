import { readFileSync } from 'fs';
import { join } from 'path';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AgentDefinitionBuilder } from '../bin/constructs/AgentDefinitionBuilder';
import { AgentActionGroup } from '../bin/constructs/AgentActionGroup';
import { inlineCode, inlineSchema, permissionTestObject } from './utils/constants';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { BedrockAgentBlueprintsConstruct } from '../bin/BedrockAgentBlueprintsConstruct';
import { CfnAgentProps } from 'aws-cdk-lib/aws-bedrock';
import { BedrockGuardrailsBuilder } from '../bin/constructs/BedrockGuardrailsBuilder';

describe('BedrockAgentBlueprintsConstruct', () => {
    let app: App;
    let stack: Stack;
    let agentDef: CfnAgentProps;

    beforeEach(() => {
        app = new App();
        stack = new Stack(app, 'TestStack', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } });
        agentDef = new AgentDefinitionBuilder(stack, 'NewAgentDef', {})
            .withAgentName('NewFriendlyAgent')
            .withInstruction('nice new fun agent to do great things in code')
            .build();
    });

    test('creates an IAM role when agentResourceRoleArn is not provided', () => {
        new BedrockAgentBlueprintsConstruct(stack, 'TestConstruct', { agentDefinition: agentDef });
        const template = Template.fromStack(stack);

        template.resourceCountIs('AWS::IAM::Role', 1);
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: [
                    {
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'bedrock.amazonaws.com',
                        },
                        Condition: {
                            StringEquals: {
                                'aws:SourceAccount': '123456789012',
                            },
                        },
                    },
                ],
            },
        });
    });

    test('associates actionGroups to agents and uploads action lambda', () => {
        const action = new AgentActionGroup(stack, 'TestAction', {
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
        new BedrockAgentBlueprintsConstruct(stack, 'TestConstruct', {
            agentDefinition: agentDef,
            actionGroups: [action]
        });
        const template = Template.fromStack(stack);

        template.resourceCountIs('AWS::Bedrock::Agent', 1);
        template.hasResourceProperties('AWS::Bedrock::Agent', {
            AgentName: 'NewFriendlyAgent',
            FoundationModel: 'anthropic.claude-v2',
            ActionGroups: [
                {
                    ActionGroupExecutor: {
                        Lambda: {
                            'Fn::GetAtt': [Match.stringLikeRegexp(`TestAction.*`), 'Arn'],
                        }
                    },
                    ActionGroupName: 'DummyAction',
                    ActionGroupState: 'ENABLED',
                    ApiSchema: {
                        Payload: Match.anyValue(),
                    },
                    Description: 'Dummy action for dummy agent'
                }
            ],
        });
        template.hasResourceProperties('AWS::Lambda::Function', {
            Code: {
                ZipFile: inlineCode.toString('utf8'),
            },
            Handler: 'index.handler',
            Runtime: 'nodejs18.x',
        });
    });

    test('uploads schema file to S3 bucket when provided', () => {
        const fileBuffer = readFileSync(join(__dirname, 'utils', 'openAPISchema.json'));
        const action = new AgentActionGroup(stack, 'TestAction', {
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
                apiSchemaFile: fileBuffer
            },
        });
        new BedrockAgentBlueprintsConstruct(stack, 'TestConstruct', {
            agentDefinition: agentDef,
            actionGroups: [action]
        });

        const template = Template.fromStack(stack);

        template.resourceCountIs('AWS::S3::Bucket', 2);
        template.hasResourceProperties('AWS::S3::Bucket', {
            BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                    {
                        ServerSideEncryptionByDefault: {
                            SSEAlgorithm: "AES256"
                        }
                    }
                ]
            },
            LoggingConfiguration: {
                DestinationBucketName: {
                    Ref: Match.stringLikeRegexp(`TestConstructAgentBlueprintAssetsAccessLogs.*`),
                },
                LogFilePrefix: "logs/"
            },
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true
            },
            VersioningConfiguration: {
                Status: "Enabled"
            }
        });
        template.resourceCountIs('Custom::CDKBucketDeployment', 1);
        template.hasResourceProperties('AWS::Bedrock::Agent', {
            ActionGroups: [
                {
                    ApiSchema: {
                        S3: {
                            S3BucketName: {},
                            S3ObjectKey: {},
                        },
                    },
                },
            ],
        });
    });

    test('associates guardrails when provided', () => {
        const guardrail = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
            name: 'TestGuardrail',
            description: 'Test guardrail with all configurations',
            generateKmsKey: true,
        }).build();

        new BedrockAgentBlueprintsConstruct(stack, 'TestConstruct', {
            agentDefinition: agentDef,
            guardrail: guardrail,
        });
        const template = Template.fromStack(stack);

        template.resourceCountIs('AWS::KMS::Key', 1);
        template.resourceCountIs('AWS::Bedrock::Agent', 1);
        template.hasResourceProperties('AWS::Bedrock::Agent', {
            AgentName: 'NewFriendlyAgent',
            FoundationModel: 'anthropic.claude-v2',
            GuardrailConfiguration: {
                GuardrailIdentifier: { 'Fn::GetAtt': [Match.stringLikeRegexp(`TestGuardrail.*`), 'GuardrailId'] },
                GuardrailVersion: { 'Fn::GetAtt': [Match.stringLikeRegexp(`TestGuardrail.*`), 'Version'] },
            }
        });
    });
});