# Amazon Bedrock Agent Blueprints Construct

The `BedrockAgentBlueprintsConstruct` is a high-level construct that simplifies the process of creating and configuring Amazon Bedrock agents. It provides a convenient way to define agent properties, action groups, knowledge bases, and guardrails.

## Prerequisites

Before you can use the `BedrockAgentBlueprintsConstruct`, ensure that you have the following:
- An AWS account with the necessary permissions to create and manage Bedrock resources.
- The AWS CDK installed and configured on your local machine.
- Node.js and npm installed.
    

## Installation

1. Create a new CDK project or navigate to an existing one.    
2. Install the `BedrockAgentBlueprintsConstruct` package:

```
npm install @aws-samples/agents-for-amazaon-bedrock-blueprints
```

## Usage

Here's an example of how to use the `BedrockAgentBlueprintsConstruct` in your CDK app:

```
import { App, Stack } from 'aws-cdk-lib';
import { AgentDefinitionBuilder } from './constructs/AgentDefinitionBuilder';
import { AgentActionGroup } from './constructs/AgentActionGroup';
import { BedrockAgentBlueprintsConstruct } from './BedrockAgentBlueprintsConstruct';

const app = new App();
const stack = new Stack(app, 'MyStack');

// Define the agent properties
const agentDef = new AgentDefinitionBuilder(stack, 'NewAgentDef', {})
  .withAgentName('MyFriendlyAgent')
  .withInstruction('A helpful agent for coding tasks')
  .build();

// Define an action group
const action = new AgentActionGroup(stack, 'MyAction', {
  actionName: 'CodeAction',
  description: 'An action for generating code snippets',
  lambdaDefinition: {
    // Lambda function definition
  },
  schemaDefinition: {
    // API schema definition
  },
});

// Create the BedrockAgentBlueprintsConstruct
new BedrockAgentBlueprintsConstruct(stack, 'MyAgentBlueprint', {
  agentDefinition: agentDef,
  actionGroups: [action],
});
```


In this example, we first define the agent properties using the `AgentDefinitionBuilder`. Then, we create an action group with a Lambda function and API schema definition. Finally, we instantiate the `BedrockAgentBlueprintsConstruct` and pass in the agent definition and action group.
You can further customize the agent by adding knowledge bases, guardrails, and other configurations.

## Features

The `BedrockAgentBlueprintsConstruct` provides several customization options:

### Opt-out of creating knowledge base (KB) resources

Users can choose to opt-out of creating KB resources as it can become expensive to deploy the AOSS clusters for KB. If any template initializes KB, you can skip KB creation by adding a flag skipKBCreation in the CDK context.

Example:
```
cdk synth <STACK_NAME> --context skipKBCreation=true
```

### IAM Role Management
The `BedrockAgentBlueprintsConstruct' will automatically create and manage an IAM role for your Bedrock agent if you don't provide one. If you don't specify an `agentResourceRoleArn` in the `AgentDefinitionBuilder`, the construct will create a new IAM role with the necessary permissions for your agent. It will add required permissions for the ActionGroup invocation, FoundationModel access, KB access etc.

However, if you prefer to use an existing IAM role, you can provide the ARN of that role using the `withAgentResourceRoleArn()` method in the `AgentDefinitionBuilder`.

This also adds a resource policy to the Lambda functions associated with the provided action groups. The permission allows the 'bedrock.amazonaws.com' service principal to invoke the Lambda function, using the agent's ARN as the source ARN. This ensures that the Bedrock service can invoke the Lambda functions associated with the agent's action groups

### Asset bucket management
The `BedrockAgentBlueprintsConstruct` automatically creates and manages Amazon S3 buckets for storing the contents of your knowledge bases and action groups. When you define a knowledge base using the `AgentKnowledgeBase`construct and add files from local store and/or when you use a file for defining schema for an action group using the `AgentActionGroup` construct the `BedrockAgentBlueprintsConstruct` creates an S3 bucket and uploads the specified asset files to it under separate folders. This feature simplifies the management of your agent's assets and ensures that they are securely stored and easily accessible by the corresponding AWS services. 

## Helper constructs

### Agent Definition

The `AgentDefinitionBuilder`is a utility construct that simplifies the process of creating and configuring Amazon Bedrock agent definitions. It follows the builder pattern and uses composition to generate the `CfnAgentProps` required for creating a Bedrock agent.

#### Generating CfnAgentProps
The primary purpose of the `AgentDefinitionBuilder` is to generate the `CfnAgentProps` object, which is required for creating a Bedrock agent using the CfnAgent CDK construct. The builder provides a fluent interface for setting various properties of the agent definition, such as the agent name, instruction, foundation model, etc. Example:
```
const agentDef = new AgentDefinitionBuilder(stack, 'NewAgentDef', {})
  .withAgentName('MyAgent')
  .withInstruction('My agent instructions to build a great agent')
  .withFoundationModel('anthropic.claude-v2')
  .withAgentResourceRoleArn('arn:aws:iam::123456789012:role/MyExistingRole')
  .build();
```

#### Prompt Configuration
The `AgentDefinitionBuilder` simplifies the creation and configuration of prompts for your Bedrock agent. It provides methods for adding different types of prompts from the prompt library, such as pre-processing, post-processing, and response generation prompts.

```
const prompt: bedrock.CfnAgent.PromptConfigurationProperty = {
  promptType: PromptType.PRE_PROCESSING,
  promptCreationMode: PromptConfig_Default,
  basePromptTemplate: 'This is a test prompt',
};

builder.withPreprocessingPrompt(prompt);
```
The builder also includes validations to ensure that prompt configurations are valid and consistent. For example, it checks if the required fields are provided and prevents redefining the same prompt type.

#### User Input Action
Creating a user input action group is not straightforward when using the AWS CLI or SDK. The `AgentDefinitionBuilder` simplifies this process by providing the `withUserInput()` method, which automatically creates and configures the necessary resources for a user input action group.
```
const builder = new AgentDefinitionBuilder(stack, 'NewAgentDef', {});
builder.withAgentName('MyAgent');
builder.withUserInput();
```

This method adds the required action group, using parentActionGroupSignature as `AMAZON.UserInput`

### Action Groups

The `AgentActionGroup` construct is a lightweight utility that allows you to define and configure action groups for your Amazon Bedrock agent. Action groups represent a set of actions that your agent can perform, and they are associated with a Lambda function and an API schema.

#### Properties

* actionGroupName(required): The name of the action group.
* description(optional): A description of the action group.
* actionGroupExecutor(required): An object that defines the Lambda function responsible for executing the action group. This allows you to customize the Lambda function that will execute the action group. You can specify the following properties:
  * lambdaDefinition: An object that defines the Lambda function code, handler, and runtime.
    * lambdaCode: The code for the Lambda function (e.g., an inline code buffer or a reference to a file).
    * lambdaHandler: The handler function for the Lambda function.
    * lambdaRuntime: The runtime environment for the Lambda function (e.g., nodejs18.x).
  * lambdaExecutor: Custom lambda function object that can directly be associated with an action.
  * customControl: Constant string that will be returned to the user as a fixed response.
  * NOTE: if all multiple params are defined lambdaExecutor will take precedence followed by lambdaDefinition then customControl.
* schemaDefinition(required): An object that allows you to define the API/Function schema for the action group. You can specify the schema in one of the following ways:
  * inlineAPISchema: An inline API schema definition as a string.
  * apiSchemaFile: A file buffer containing the API schema definition. The BedrockAgentBlueprintsConstruct will make a deployment to S3 and construct the URI params to link to the action.
  * functionSchema: Defines functions that each define parameters that the agent needs to invoke from the user.
* actionGroupState(optional): The state of the action group (ENABLED or DISABLED).
* parentActionGroupSignature(optional): Used to define reserved actions.

#### Example:
```
const inlineCode = Buffer.from(
    `
        exports.handler = async (event) => {
            return { message: process_stuff() };
        };
    `);

const fileBufferSchema: Buffer = readFileSync(resolve(__dirname, 'assets', 'openAPISchema.json'));
const action1 = new AgentActionGroup(this, 'NewAction', {
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
        inlineAPISchema: fileBufferSchema.toString('utf8')
    },
});

const lambdaFunction = new Function(this, 'MyLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromInline(inlineCode.toStrint('utf8')),
      handler: 'index.handler',
    });

const action2 = new AgentActionGroup(this, 'NewAction', {
    actionGroupName: 'DummyAction2',
    description: 'Dummy action for dummy agent',
    actionGroupExecutor: {
        lambdaExecutor: lambdaFunction,
    },
    schemaDefinition: {
        apiSchemaFile: fileBufferSchema,
    },
});

const action3 = new AgentActionGroup(this, 'NewAction', {
    actionGroupName: 'DummyAction3',
    description: 'Call this action when nothing is available',
    actionGroupExecutor: {
        customControl: 'Nothing is available',
    }
});

new BedrockAgentBlueprintsConstruct(stack, 'MyAgentBlueprint', {
  agentDefinition: agentDef,
  actionGroups: [action1, action2, action3],
});
```

### Knowledge Bases

The `AgentKnowledgeBase` construct is a utility class that simplifies the creation and management of Amazon Bedrock knowledge bases. A knowledge base is a repository of information that can be used to train and enhance the capabilities of an Agent.
The `AgentKnowledgeBase` construct allows you to configure various aspects of a knowledge base, such as the storage configuration, knowledge base type, and data sources.
To create a basic knowledge base with default settings, you can use the following code:

```
const kbProps = {
  kbName: 'TestKB',
  agentInstruction: 'Test instruction for the Knowledge Base',
  assertFiles: [/* ... */], // Array of file buffers to include in the Knowledge Base
};

const kb = new AgentKnowledgeBase(stack, 'TestKB', kbProps);
```

This will create a knowledge base with the name 'TestKB', set default values for the embedding model TITAN_EMBED_TEXT_V1 with AmazonOpenSearchServerless collection, and set default vector index.

#### Customizing Knowledge Base Properties

You can customize various properties of the knowledge base by passing additional options to the `AgentKnowledgeBase` constructor:

```
const kbProps = {
  kbName: 'TestKB',
  agentInstruction: 'Test instruction for the Knowledge Base',
  assertFiles: [/* ... */],
  storageConfiguration: {
    type: 'OPENSEARCH_SERVERLESS',
    configuration: {
      indexConfiguration: {...custom index config}
    },
  },
  embeddingModel: BedrockKnowledgeBaseModels.TITAN_EMBED_TEXT_V1
};

const kb = new AgentKnowledgeBase(stack, 'TestKB', kbProps);
```

### IAM Role Management
`AgentKnowledgeBase` will create a service role to allow agent to access the KB and allow the KB to access the asset files in S3, permissions for accessing the AOSS collection, and indices and permissions for accessing the embedding models.


#### Creating and Synchronizing Data Sources

The `AgentKnowledgeBase` construct provides a method `createAndSyncDataSource` to create and synchronize data sources with the knowledge base. Data sources can be Amazon S3 buckets or folders containing the information you want to include in the Knowledge Base.
When we attach a knowledge base to the `BedrockAgentBlueprintsConstruct` it calls the `createAndSyncDataSource` to populate the knowledge base with the data in asset management bucket.


#### OpenSearchServerlessHelper

The `OpenSearchServerlessHelper` construct is a utility class that simplifies the creation and management of Amazon OpenSearch Serverless collections and indices. This construct is used internally by the `AgentKnowledgeBase` construct when configuring the storage configuration with OpenSearch Serverless.

When you create an `AgentKnowledgeBase` with the `storageConfig.type = 'OPENSEARCH_SERVERLESS'`, the `OpenSearchServerlessHelper` construct is used to create an OpenSearch Serverless collection and the necessary resources (access policies, security policies, and Lambda functions) for managing the collection.

You can also use the `OpenSearchServerlessHelper` construct directly if you need to create and manage OpenSearch Serverless collections and indices outside of the `AgentKnowledgeBase` context:

```
import { OpenSearchServerlessHelper, CollectionType } from './constructs/utilities/OpenSearchServerlessHelper';

const helper = new OpenSearchServerlessHelper(stack, 'TestHelper', {
  collectionName: 'test-collection',
  accessRoles: [accessRole],
  region: 'us-east-1',
  accountId: '123456789012',
  collectionType: CollectionType.VECTORSEARCH, // Specify the collection type
});
```

### Guardrails

The `BedrockGuardrailsBuilder` construct is a utility class that simplifies the creation of Amazon Bedrock Guardrails. Guardrails are a set of rules and policies that help ensure the safety and compliance of your AI applications. The 
`BedrockGuardrailsBuilder` allows you to configure various aspects of a Guardrail, such as content filtering, sensitive information handling, topic management, and word policies.
After you've built the Guardrail using the `BedrockGuardrailsBuilder` you can associate it with an Amazon Bedrock Agent Blueprint using the `BedrockAgentBlueprintsConstruct`

```
const guardrail = guardrailBuilder.build();

new BedrockAgentBlueprintsConstruct(stack, 'TestConstruct', {
  agentDefinition: agentDefinition,
  guardrail: guardrail,
});
```

This will associate the Guardrail with the Agent Blueprint ensuring that the configured policies are applied to the Agent.

#### Customizing Guardrail Properties

You can customize various properties of the Guardrail by passing additional options to the `BedrockGuardrailsBuilder` constructor:

```
const guardrailBuilder = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
  name: 'TestGuardrail',
  blockedInputMessaging: 'Custom input message',
  blockedOutputsMessaging: 'Custom output message',
  description: 'Test guardrail description',
  kmsKeyArn: 'kmsKeyArn', // Existing KMS Key ARN
});
const guardrail = guardrailBuilder.build();
```


#### Generating a KMS Key

If you want the `BedrockGuardrailsBuilder` to generate a new KMS key for you, you can set the `generateKmsKey` to `true`. Or you can provide your own key with `kmsKeyArn`

```
const guardrailBuilder = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
  name: 'TestGuardrail',
  generateKmsKey: true,
});
const guardrail = guardrailBuilder.build();
```


#### Configuring Content Policies

The `BedrockGuardrailsBuilder` allows you to configure content policies for filtering, sensitive information handling, topic management, and word policies. Here's an example of how to use these configurations:

```
const guardrailBuilder = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
  name: 'TestGuardrail',
  description: 'Test guardrail with all configurations',
  generateKmsKey: true,
})
  .withFiltersConfig(FilterType.VIOLENCE, FilterStrength.HIGH, FilterStrength.MEDIUM)
  .withFiltersConfig(FilterType.SEXUAL, FilterStrength.LOW)
  .withPIIConfig(PIIAction.BLOCK, PIIType.EMAIL)
  .withPIIConfig(PIIAction.ANONYMIZE, PIIType.NAME)
  .withTopicConfig('Politics', 'Discussions related to politics', ['election', 'government'])
  .withManagedWordsConfig(ManagedWordsTypes.PROFANITY)
  .withWordsConfig(['badword1', 'badword2']);
const guardrail = guardrailBuilder.build();
```

This example demonstrates how to configure filters for violence and sexual content, handle sensitive information like emails and names, manage topics related to politics, and block or allow specific words or profanity.


## Testing

The `BedrockAgentBlueprintsConstruct` includes unit tests to ensure the correct behavior of the construct. You can run the tests using the following command:

```
npm test
```

## Deployment

To deploy your CDK app with the `BedrockAgentBlueprintsConstruct`, follow the standard CDK deployment process:

```
npm run build
cdk synth
cdk deploy
```

This will synthesize the CloudFormation template and deploy the resources to your AWS account.
