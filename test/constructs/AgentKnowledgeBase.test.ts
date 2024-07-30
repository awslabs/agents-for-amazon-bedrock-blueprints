import { App, Stack } from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AgentKnowledgeBase } from '../../lib/constructs/AgentKnowledgeBase';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('AgentKnowledgeBase', () => {
    let app: App;
    let stack: Stack;
    let accessRole: Role;
    let fileBuffers: Buffer[] = [];

    beforeEach(() => {
        app = new App();
        stack = new Stack(app, 'TestStack');
        accessRole = new Role(stack, 'AccessRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        });
        fileBuffers.push(readFileSync(join(__dirname, '..', 'utils', 'openAPISchema.json')));
    });

    test('creates a knowledge base with default configuration', () => {
        const kbProps = {
            kbName: 'test-kb',
            agentInstruction: 'Test instruction',
            assertFiles: fileBuffers,
            accessRoles: [accessRole],
        };
        new AgentKnowledgeBase(stack, 'TestKB', kbProps);

        const template = Template.fromStack(stack);
        template.resourceCountIs('AWS::Bedrock::KnowledgeBase', 1);
        template.hasResourceProperties('AWS::Bedrock::KnowledgeBase', {
            Name: 'test-kb',
            KnowledgeBaseConfiguration: {
                Type: 'VECTOR',
                VectorKnowledgeBaseConfiguration: {
                    EmbeddingModelArn: 'arn:aws:bedrock:us-west-2::foundation-model/amazon.titan-embed-text-v1',
                },
            },
            StorageConfiguration: {
                Type: 'OPENSEARCH_SERVERLESS',
                OpensearchServerlessConfiguration: {
                    CollectionArn: {
                        'Fn::GetAtt': [
                            Match.stringLikeRegexp(`TestKBAOSSCollection.*`) ,
                            'Arn'
                        ]
                    },
                    FieldMapping: {
                        MetadataField: 'AMAZON_BEDROCK_METADATA',
                        TextField: 'AMAZON_BEDROCK_TEXT_CHUNK',
                        VectorField: 'bedrock-knowledge-base-default-vector'
                    },
                    VectorIndexName: 'agent-blueprints-kb-default-index'
                },
            },
        });
        template.resourceCountIs('AWS::OpenSearchServerless::Collection', 1);
        template.resourceCountIs('AWS::OpenSearchServerless::AccessPolicy', 1);
        template.resourceCountIs('AWS::OpenSearchServerless::SecurityPolicy', 2);
        template.resourceCountIs('AWS::Lambda::Function', 4);
        template.resourceCountIs('AWS::CloudFormation::CustomResource', 2);
    });

    test('creates a data source and synchronizes it', () => {
        const kbProps = {
            kbName: 'test-kb',
            assertFiles: fileBuffers,
            agentInstruction: 'Test instruction',
            accessRoles: [accessRole],
        };
        const kb = new AgentKnowledgeBase(stack, 'TestKB', kbProps);
        kb.createAndSyncDataSource('arn:aws:s3:::test-bucket', 'test-folder');

        const template = Template.fromStack(stack);
        template.resourceCountIs('AWS::Bedrock::DataSource', 1);
        template.hasResourceProperties('AWS::Bedrock::DataSource', {
            Name: 'test-kb-DataSource',
            DataSourceConfiguration: {
                S3Configuration: {
                    BucketArn: 'arn:aws:s3:::test-bucket',
                    InclusionPrefixes: ['test-folder'],
                },
                Type: 'S3',
            },
            KnowledgeBaseId: { 
                'Fn::GetAtt': [ Match.stringLikeRegexp(`TestKBKnowledgeBase.*`), 'KnowledgeBaseId' ],
            },
        });
        template.resourceCountIs('AWS::CloudFormation::CustomResource', 3);
    });
});