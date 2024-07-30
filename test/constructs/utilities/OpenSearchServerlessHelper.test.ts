import { App, Stack } from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { OpenSearchServerlessHelper, CollectionType } from '../../../bin/constructs/utilities/OpenSearchServerlessHelper';
import { Template } from 'aws-cdk-lib/assertions';

describe('OpenSearchServerlessHelper', () => {
    let app: App;
    let stack: Stack;
    let accessRole: Role;

    beforeEach(() => {
        app = new App();
        stack = new Stack(app, 'TestStack');
        accessRole = new Role(stack, 'TestAccessRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        });
    });

    test('creates a collection with default configuration', () => {
        new OpenSearchServerlessHelper(stack, 'TestHelper', {
            collectionName: 'test-collection',
            accessRoles: [accessRole],
            region: process.env.CDK_DEFAULT_REGION || '',
            accountId: process.env.CDK_DEFAULT_ACCOUNT || '',
        });

        const template = Template.fromStack(stack);
        template.resourceCountIs('AWS::OpenSearchServerless::Collection', 1);
        template.resourceCountIs('AWS::OpenSearchServerless::AccessPolicy', 1);
        template.resourceCountIs('AWS::OpenSearchServerless::SecurityPolicy', 2);
        template.resourceCountIs('AWS::Lambda::Function', 2);
        template.resourceCountIs('AWS::CloudFormation::CustomResource', 1);
        template.hasResourceProperties('AWS::OpenSearchServerless::Collection', {
            Type: 'VECTORSEARCH',
        });
    });

    test('creates a collection with custom configuration', () => {
        new OpenSearchServerlessHelper(stack, 'TestHelper', {
            collectionName: 'test-collection',
            accessRoles: [accessRole],
            region: process.env.CDK_DEFAULT_REGION || '',
            accountId: process.env.CDK_DEFAULT_ACCOUNT || '',
            collectionType: CollectionType.SEARCH,
            indexName: 'custom-index',
            indexConfiguration: {
                settings: {
                    index: {
                        number_of_shards: 2,
                    },
                },
            },
        });

        const template = Template.fromStack(stack);
        template.resourceCountIs('AWS::OpenSearchServerless::Collection', 1);
        template.hasResourceProperties('AWS::OpenSearchServerless::Collection', {
            Type: 'SEARCH',
        });
        template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
            indexName: 'custom-index',
            indexConfiguration: {
                settings: {
                    index: {
                        number_of_shards: 2,
                    },
                },
            },
        });
    });

    test('creates a Lambda execution role with correct permissions', () => {
        new OpenSearchServerlessHelper(stack, 'TestHelper', {
            collectionName: 'test-collection',
            accessRoles: [accessRole],
            region: process.env.CDK_DEFAULT_REGION || '',
            accountId: process.env.CDK_DEFAULT_ACCOUNT || '',
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: [{
                    Action: 'sts:AssumeRole',
                    Effect: 'Allow',
                    Principal: { Service: 'lambda.amazonaws.com' }
                }
                ]
            },
            ManagedPolicyArns: [
                {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            { Ref: 'AWS::Partition' },
                            ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                        ],
                    ],
                },
            ],
            Policies: [
                {
                    PolicyDocument: {
                        Statement: [
                            {
                                Action: 'aoss:APIAccessAll',
                                Effect: 'Allow',
                                Resource: 'arn:aws:aoss:us-west-2:123456789012:collection/*',
                            },
                        ],
                        Version: '2012-10-17',
                    },
                    PolicyName: 'AOSSAccess',
                },
            ],
        });
    });
});