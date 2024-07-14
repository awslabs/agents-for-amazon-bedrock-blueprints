import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BedrockAgentBlueprintsConstruct } from '../../bin/BedrockAgentBlueprintsConstruct';
import { AgentDefinitionBuilder } from '../../bin/constructs/AgentDefinitionBuilder';
import { aws_yml_converter } from '../prompt_library/aws_yml_converter';

export class DemoTemplateStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const agentDef = new AgentDefinitionBuilder(this, 'NewAgentDef', {})
            .withAgentName('FunnyAgent')
            .withInstruction('You are a funny and intellectual agent that responds to all queries with a joke at the end.')
            .withUserInput()
            .build();

        new BedrockAgentBlueprintsConstruct(this, 'AmazonBedrockAgentBlueprintsStack', {
            agentDefinition: agentDef
        });
    }
}
