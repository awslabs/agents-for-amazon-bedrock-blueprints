## Agent Definition

The `AgentDefinitionBuilder`is a utility construct that simplifies the process of creating and configuring Amazon Bedrock agent definitions. It follows the builder pattern and uses composition to generate the `CfnAgentProps` required for creating a Bedrock agent.

<h4>Generating CfnAgentProps</h4>
The primary purpose of the `AgentDefinitionBuilder` is to generate the `CfnAgentProps` object, which is required for creating a Bedrock agent using the CfnAgent CDK construct. The builder provides an easy-to-use interface for specifying various properties of the agent definition, such as the agent name, instruction, foundation model, etc. Example:
```
const agentDef = new AgentDefinitionBuilder(stack, 'NewAgentDef', {})
  .withAgentName('MyAgent')
  .withInstruction('My agent instructions to build a great agent')
  .withFoundationModel('anthropic.claude-v2')
  .withAgentResourceRoleArn('arn:aws:iam::123456789012:role/MyExistingRole')
  .build();
```

<h4>Prompt Configuration</h4>
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

<h4>User Input Action</h4>
Creating a user input action group is not straightforward when using the AWS CLI or SDK. The `AgentDefinitionBuilder` simplifies this process by providing the `withUserInput()` method, which automatically creates and configures the necessary resources for a user input action group.
```
const builder = new AgentDefinitionBuilder(stack, 'NewAgentDef', {});
builder.withAgentName('MyAgent');
builder.withUserInput();
```

This method adds the required action group, using parentActionGroupSignature as `AMAZON.UserInput`

## Action Groups

The `AgentActionGroup` construct is a lightweight utility at allows you to define and configure action groups for your Amazon Bedrock agent. Action groups represent the set of actions that your agent can perform, and they are associated with a Lambda function and an API schema.

<h4>Properties</h4>

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

<h4>Example:</h4>
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

## Knowledge Bases

The `AgentKnowledgeBase` construct is a utility class that simplifies the creation and management of Amazon Bedrock Knowledge Bases. A knowledge base is a repository of information that can be used to train and enhance the capabilities of an agent.
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

This will create a knowledge base with the name 'TestKB', set default values for the embedding model TITAN_EMBED_TEXT_V1 with AmazonOpenSearchServerless collection and set up a default vector index.

<h4>Customizing knowledge base Properties</h4>

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

## IAM Role Management
`AgentKnowledgeBase` will create a service role to allow agent to access the KB and allow the KB to access the asset files in S3, permissions for accessing the AOSS collection and indices and permissions for accessing the embedding models.


<h4>Creating and Synchronizing Data Sources</h4>

The `AgentKnowledgeBase` construct provides a method `createAndSyncDataSource` to create and synchronize data sources with the Knowledge Base. Data sources can be Amazon S3 buckets or folders containing the information you want to include in the Knowledge Base:
When we attach a knowledgebase to the `BedrockAgentBlueprintsConstruct` it calls the `createAndSyncDataSource` to populate the KB with the data in asset management bucket.


<h4>OpenSearchServerlessHelper</h4>

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

## Guardrails

The `BedrockGuardrailsBuilder` construct is a utility class that simplifies the creation of Amazon Bedrock Guardrails. Guardrails are a set of rules and policies that help ensure the safety and compliance of your AI applications. The 
`BedrockGuardrailsBuilder` allows you to configure various aspects of a Guardrail, such as content filtering, sensitive information handling, topic management, and word policies.
Once you've built the Guardrail using the `BedrockGuardrailsBuilder` you can associate it with an Amazon Bedrock Agent Blueprint using the `BedrockAgentBlueprintsConstruct`

```
const guardrail = guardrailBuilder.build();

new BedrockAgentBlueprintsConstruct(stack, 'TestConstruct', {
  agentDefinition: agentDefinition,
  guardrail: guardrail,
});
```

This will associate the Guardrail with the Agent Blueprint ensuring that the configured policies are applied to the Agent.

<h4>Customizing Guardrail Properties</h4>

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


<h4>Generating a KMS Key</h4>

If you want the `BedrockGuardrailsBuilder` to generate a new KMS key for you, you can set the `generateKmsKey` to `true`. Or you can provide your own with `kmsKeyArn`

```
const guardrailBuilder = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
  name: 'TestGuardrail',
  generateKmsKey: true,
});
const guardrail = guardrailBuilder.build();
```


<h4>Configuring Content Policies</h4>

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