<h1>Agent with Knowledge Base and Guardrails</h1>

This Agent Blueprint demonstrates how to create a Restaurant Assistant Agent using Amazon Bedrock, AWS CDK, and the `BedrockAgentBlueprintsConstruct`. It showcases the integration of a knowledge base and the implementation of guardrails to ensure the agent's responses adhere to specific guidelines and content filters.

<h2>Quick Start: Deploying the Agent Blueprint</h2>

To deploy this Agent Blueprint:

1. Ensure you have the AWS CDK installed and configured.
2. Clone the [repository](https://github.com/aws-samples/amazon-bedrock-samples){:target="_blank"} containing these stacks and the BedrockAgentBlueprintsConstruct.
3. Run the below code:
```deploy_stack.ts
cdk deploy AgentWithKBandGuardrailsStack
```

This single command will automatically deploy the `RestaurantAssistDatabaseStack` and the `AgentWithKBandGuardrailsStack` in the correct order, thanks to the dependency condition set up in your CDK code.

After deployment, you can interact with the agent through the Amazon Bedrock console or API to manage restaurant bookings and access menu information.

<h2>Knowledge Base Integration</h2>

This Agent Blueprint incorporates a knowledge base to provide the agent with access to relevant information about the restaurant's menu. The knowledge base is created using the `AgentKnowledgeBase` construct, which allows you to specify the knowledge base name, an instruction for the agent, and the asset files containing the menu information.

The `readMenuFiles` method is used to read the menu files from a specified directory and create a `fileBuffers` object containing the file contents. This object is then passed to the `AgentKnowledgeBase` construct during the knowledge base creation.

By integrating a knowledge base, the agent can retrieve and utilize information from the menu files to assist users with inquiries related to the restaurant's offerings.

<h2>Guardrails Configuration</h2>

In addition to the knowledge base integration, this Agent Blueprint implements guardrails to ensure the agent's responses adhere to specific guidelines and content filters. The `BedrockGuardrailsBuilder` construct is used to define the guardrail configuration, which includes the following components:

1. **Filter Types**: Specifies the types of filters to apply, such as filtering out insults or profanity.
2. **Managed Words**: Configures the use of managed word lists, such as profanity or offensive language.
3. **Custom Words**: Allows you to define a list of custom words or phrases to filter out.
4. **PII Configuration**: Enables the anonymization or redaction of specific types of personally identifiable information (PII), such as social security numbers.
5. **Topic Configuration**: Allows you to define topics or subjects that should be avoided or handled with caution.

By implementing guardrails, you can ensure that the agent's responses are appropriate, respectful, and aligned with your content guidelines.

<h2>Overview</h2>

The blueprint consists of two main stacks and a custom construct:

1. **AgentWithKBandGuardrailsStack**: Creates the Bedrock Agent with the associated knowledge base and guardrails.
2. **RestaurantAssistDatabaseStack**: Sets up a DynamoDB table for storing booking information.
3. **BedrockAgentBlueprintsConstruct**: A reusable construct for creating Bedrock Agents.

<h2>Key Components</h2>

<h3>1. Database Setup (RestaurantAssistDatabaseStack)</h3>

- Creates a DynamoDB table named `BookingTable` with a partition key `booking_id` of type string.
- Configures the table for on-demand billing and sets the removal policy to destroy the table when the stack is deleted.

<h3>2. Agent Creation (AgentWithKBandGuardrailsStack)</h3>

- Defines the agent using `AgentDefinitionBuilder`:
  - Sets the agent name, instructions, and foundation model.
- Creates an `AgentActionGroup` with three function definitions:
  - `get_booking_details`: Retrieves details of a restaurant booking.
  - `create_booking`: Creates a new restaurant booking.
  - `delete_booking`: Deletes an existing restaurant booking.
- Configures guardrails using `BedrockGuardrailsBuilder`:
  - Filters out insults and profanity.
  - Anonymizes social security numbers.
  - Defines custom words and topics to filter or avoid.
- Creates a knowledge base using `AgentKnowledgeBase`:
  - Reads menu files from a specified directory.
  - Associates the knowledge base with the agent.

<h3>3. BedrockAgentBlueprintsConstruct</h3>

This custom construct simplifies the process of creating agents for Amazon Bedrock. It handles:

- Knowledge base association and management
- Action group configuration
- Guardrails configuration
- S3 asset management for schemas and other files
- IAM role and policy setup for the agent
- Agent creation and configuration

<h2>How It Works</h2>

1. The `AgentWithKBandGuardrailsStack` is deployed, which automatically triggers the deployment of the `RestaurantAssistDatabaseStack` as a dependency.
2. The `BedrockAgentBlueprintsConstruct` is used to:
   - Create the Bedrock Agent with the defined functions and instructions
   - Set up necessary IAM roles and policies
   - Configure action groups, knowledge bases, and guardrails
   - Handle S3 asset management for schemas and knowledge base files
3. When invoked, the agent can perform various actions based on the user's input:
   - Retrieve booking details
   - Create a new booking
   - Delete an existing booking
4. If the user's input requires information from the menu, the agent can access the knowledge base to retrieve and utilize the relevant menu information.
5. The agent's responses are processed through the configured guardrails, ensuring they adhere to the specified content filters and guidelines.

<h2>Key Features</h2>

- Integrates a knowledge base for accessing menu information
- Implements guardrails for content filtering and adherence to guidelines
- Uses AWS CDK for infrastructure as code with automated stack dependencies
- Leverages DynamoDB for storing booking information
- Utilizes AWS Lambda for serverless execution of database operations
- Employs a reusable construct (BedrockAgentBlueprintsConstruct) for simplified agent creation

For more detailed information on Agents for Amazon Bedrock, knowledge base integration, and guardrails, please refer to the provided documentation and the [official AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html){:target="_blank"}.