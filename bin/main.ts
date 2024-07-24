#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { DemoTemplateStack } from '../lib/stacks/demo-template';

const permissionObject = {
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */
    /* Uncomment the next line to specialize this stack for the AWS Account
    * and Region that are implied by the current CLI configuration. */
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
    env: { account: '11111111111', region: 'us-east-1' },
};

const app = new App();
new DemoTemplateStack(app, 'AmazonBedrockAgentBlueprintsStack2', permissionObject);