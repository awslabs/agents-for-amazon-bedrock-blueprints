<h1>Agent Blueprint for Simple Email Classification</h1>

This Agent Blueprint demonstrates how to create a simple email classification Agent using Amazon Bedrock, AWS CDK, and the `BedrockAgentBlueprintsConstruct`. The agent is designed to classify customer emails into four main categories based on the provided instructions, without any additional processing or actions.

<h2>Quick Start: Deploying the Agent Blueprint</h2>

To deploy this Agent Blueprint:

1. Ensure you have the AWS CDK installed and configured.
2. Clone the [repository](https://github.com/aws-samples/amazon-bedrock-samples){:target="_blank"} containing these stacks and the BedrockAgentBlueprintsConstruct.
3. Run the below code:
```deploy_stack.ts
cdk deploy AgentWithSimpleClassificationStack
```

This command will deploy the AgentWithSimpleClassificationStack, creating the Bedrock Agent and associated resources.

After deployment, you can interact with the agent through the Amazon Bedrock console or API to classify customer emails.

<h2>Email Classification Instructions</h2>

The Simple Email Classification Agent is instructed to categorize customer emails into the following four categories:

- **CUSTOMER_SUPPORT**: When customers require the support of a service specialist to solve an existing issue or pain point.
- **COMPLAINT**: When customers want to submit a complaint about a certain service or employee.
- **FEEDBACK**: When customers are providing feedback about a service they received.
- **OTHERS**: Any other topic that does not fall into the above categories.

The agent is instructed to respond with the email classification only, without adding any additional text to the response.

<h2>Overview</h2>

The blueprint consists of a single stack and a custom construct:

1. **AgentWithSimpleClassificationStack**: Creates the Bedrock Agent for simple email classification based on the provided instructions.
2. **BedrockAgentBlueprintsConstruct**: A reusable construct for creating Bedrock Agents.

<h2>Key Components</h2>

<h3>1. Agent Creation (AgentWithSimpleClassificationStack)</h3>

- Defines the agent using `AgentDefinitionBuilder`:
  - Sets the agent name, instructions, and foundation model.
- Provides detailed instructions for the agent on how to classify customer emails into the four categories.
- Specifies that the agent should respond with the email classification only, without adding any additional text.

<h3>2. BedrockAgentBlueprintsConstruct</h3>

This custom construct simplifies the process of creating agents for Amazon Bedrock. It handles:

- Knowledge base association and management
- Action group configuration
- S3 asset management for schemas and other files
- IAM role and policy setup for the agent
- Agent creation and configuration

<h2>How It Works</h2>

1. The AgentWithSimpleClassificationStack is deployed, creating the Bedrock Agent for simple email classification.
2. When invoked, the agent receives a customer email as input.
3. Based on the instructions provided, the agent analyzes the email content and classifies it into one of the four categories: Customer Support, Complaint, Feedback, or Others.
4. The agent responds with the email classification only, without adding any additional text.

<h2>Key Features</h2>

- Implements simple email classification based on provided instructions
- Categorizes emails into four predefined categories
- Specifies that the agent should respond with the classification only
- Uses AWS CDK for infrastructure as code
- Employs a reusable construct (BedrockAgentBlueprintsConstruct) for simplified agent creation

For more detailed information on Agents for Amazon Bedrock and the BedrockAgentBlueprintsConstruct, please refer to the provided documentation and the [official AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html){:target="_blank"}.