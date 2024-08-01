#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BedrockAgentBlueprintsConstruct } from '../lib/constructs/BedrockAgentBlueprintsConstruct';
import { AgentDefinitionBuilder } from '../lib/constructs/AgentDefinitionBuilder';

const app = new cdk.App();

const props = { 
    env: { 
        account: process.env.CDK_DEFAULT_ACCOUNT, 
        region: process.env.CDK_DEFAULT_REGION 
    } 
};
const stack = new cdk.Stack(app, 'BlueprintsStack', props);
const agentDefinition = new AgentDefinitionBuilder(stack, 'NewAgentDef', {})
    .withAgentName('NewFriendlyAgent')
    .withInstruction('nice new fun agent to do great things in code')
    .build();

new BedrockAgentBlueprintsConstruct(stack, 'MainConstruct', {agentDefinition});