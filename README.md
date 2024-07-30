# Amazon Bedrock Agents Blueprints

[![license](https://img.shields.io/github/license/awslabs/agents-for-amazon-bedrock-blueprints?color=green)](https://opensource.org/licenses/MIT)

The Agent Blueprints feature aims to address the challenge of simplifying the process of getting started with building agents for Amazon Bedrock Agents

## Introduction

The `BedrockAgentBlueprintsConstruct` is an L3 construct for AWS CDK (Cloud Development Kit) that allows you to create and deploy Bedrock agents, which are AI-powered conversational agents, on AWS.This construct simplifies the process of creating and configuring Bedrock agents by providing a high-level interface for defining agent definitions, action groups, and knowledge bases.

## Key Components

The `BedrockAgentBlueprintsConstruct` is composed of the following key components:

1. **Agent Definition**: An `AgentDefinitionBuilder` is used to define the agent's properties like name, instruction, foundationModel etc. This also allows users to build the agent with different prompts from the library.
    
2. **Action** **Groups**: An `AgentActionGroup` is a placeholder construct used to define the actions that the agent can perform, and helps in setup of associated Lambda function code and OpenAPI schema. 
    
3. **Knowledge** **Bases**: An `AgentKnowledgeBase` is used to define the knowledge base for the agent, which can include various asset files for the data source. Currently this supports automated creation of an AOSS cluster, deploys the assets to an assets bucket, builds a data source, builds a KB and syncs the data source.
    

## Usage

Here's an example of how to use the `BedrockAgentBlueprintsConstruct`:

```
export class DemoTemplateStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1. Define the agent definition
        const agentDef = new AgentDefinitionBuilder(this, 'NewAgentDef', {})
            .withAgentName('MyFirstAgent')
            .withInstruction('Amazing new fun agent to do great things in code')
            .withPostProcessingPrompt(PROMPT_LIBRARY.json_converter)
            .build();

        // 2. Define the action group
        const inlineCode = Buffer.from(/* ... */);
        const inlineSchema = /* ... */;
        const action = new AgentActionGroup(this, 'NewAction', {
            actionGroupName: 'FetchAssets',
            description: 'Dummy action for first agent',
            lambdaCode: {
                lambdaCode: inlineCode,
                lambdaHandler: 'index.handler',
                lambdaRuntime: Runtime.NODEJS_18_X
            },
            inlineSchema: inlineSchema
        });

        // 3. Define the knowledge base
        const fileBuffer = fs.readFileSync(/* ... */);
        const knowledgeBase = new AgentKnowledgeBase(this, 'NewKB', {
            kbName: 'DummyKB',
            description: 'Dummy KB for dummy agent',
            assetFiles: [fileBuffer]
        });

        // 4. Create the BedrockAgentBlueprintsConstruct
        new BedrockAgentBlueprintsConstruct(this, 'AmazonBedrockAgentBlueprintsStack', {
            agentDefinition: agentDef,
            actionGroups: [action],
            knowledgeBases: [knowledgeBase]
        });
    }
}
```

In this example, we:

1. Define the agent definition using the `AgentDefinitionBuilder`
    
2. Define an action group with an inline Lambda function and OpenAPI schema.
    
3. Define a knowledge base with a CSV file.
    
4. Create the `BedrockAgentBlueprintsConstruct` and pass in the agent definition, action groups, and knowledge bases.
    

When you deploy this CDK stack, it will create the necessary AWS resources to deploy the Bedrock agent with the specified configuration.

## Customization

Users can choose to opt-out of creating KB resources as it may become expensive to deploy the AOSS clusters for KB. If any templates initializes KB, you can skip KB creation by adding a flag skipKBCreation in the CDK context.

Example:
```
cdk synth <STACK_NAME> --context skipKBCreation=true
```

## Deployment

To deploy the `BedrockAgentBlueprintsConstruct`, you can use the standard CDK deployment process:
1. Create an application that deploys the stack
    ```
    const app = new cdk.App();
    const permissionObject = {
        env: { account: 'XXXXXXXXXX', region: 'us-east-1' },
    };
    new DemoTemplateStack(app, 'AmazonBedrockAgentBlueprintsStack', permissionObject);
    ```

1. Synthesize the CloudFormation template: 
    
    ```
    cdk synth AmazonBedrockAgentBlueprintsStack
    ```
    
2. Deploy the stack: 
    
    ```
    cdk deploy AmazonBedrockAgentBlueprintsStack
    ```
    

This will create the necessary AWS resources, including the Bedrock agent, and deploy the agent to your AWS environment.


