import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { AgentDefinitionBuilder } from '../../bin/constructs/AgentDefinitionBuilder';
import { BedrockAgentBlueprintsConstruct } from '../../bin/BedrockAgentBlueprintsConstruct';
import { aws_yml_converter } from '../../lib/prompt_library/aws_yml_converter';

test('DynamoDB Table Created', () => {
    const stack = new cdk.Stack();
    // WHEN
    const agentDef = new AgentDefinitionBuilder(stack, 'NewAgentDef', {})
        .withAgentName('yolo')
        .withInstruction('nice new fun agent to do great things in code')
        .withAgentResourceRoleArn('ahjdfklajh')
        .withPostProcessingPrompt(aws_yml_converter)
        .withUserInput()
        .build();

    new BedrockAgentBlueprintsConstruct(stack, 'AmazonBedrockAgentBlueprintsStack', {
        agentDefinition: agentDef
    });
    // THEN

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::Bedrock::Agent", 1);
});