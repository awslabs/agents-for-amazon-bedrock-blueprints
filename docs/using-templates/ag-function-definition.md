<h1>Agent Blueprint with Function Definitions</h1>

This Agent Blueprint demonstrates how to create an HR Assistant Agent using Amazon Bedrock, AWS CDK, and the `BedrockAgentBlueprintsConstruct`. It showcases the power of function definitions in creating intelligent, interactive agents for HR tasks.

<h2>Quick Start: Deploying the Agent Blueprint</h2>

To deploy this Agent Blueprint:

1. Ensure you have the AWS CDK installed and configured.
2. Clone the [repository](https://github.com/aws-samples/amazon-bedrock-samples){:target="\_blank"} containing these stacks and the BedrockAgentBlueprintsConstruct.
3. Run the below code:

```deploy_stack.ts
cdk deploy AgentWithFunctionDefinitionStack
```

This single command will automatically deploy both the HRAssistDataStack and the AgentWithFunctionDefinitionStack in the correct order, thanks to the dependency condition set up in your CDK code.

After deployment, you can interact with the agent through the Amazon Bedrock console or API to manage employee vacation time.

<h2>What is Function Definitions?</h2>

Function definitions is a key feature of Amazon Bedrock Agents, allowing you to specify the parameters that an agent needs to collect from users. This capability enables agents to:

1. Determine necessary information for completing tasks
2. Guide conversations to gather required data
3. Ensure all prerequisites are met before executing actions

For example, in our HR Assistant Agent, we define functions like `reserve_vacation_time` with parameters such as:

- `employee_id` (integer, required)
- `start_date` (string, required)
- `end_date` (string, required)

This ensures the agent collects all necessary information before processing a vacation request. If a user doesn't provide all required details upfront, the agent will ask follow-up questions to gather the missing information.

For more details on this feature, refer to the [Amazon Bedrock documentation on defining function details for action groups](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-action-function.html){:target="\_blank"}.

<h2>Overview</h2>

The blueprint consists of two main stacks and a custom construct, with an automated deployment process:

1. **HRAssistDataStack**: Sets up the database infrastructure.
2. **AgentWithFunctionDefinitionStack**: Creates the Bedrock Agent with function definitions.
3. **BedrockAgentBlueprintsConstruct**: A reusable construct for creating Bedrock Agents.

<h2>Key Components</h2>

<h3>1. Database Setup (HRAssistDataStack)</h3>

- Creates an Aurora Serverless PostgreSQL database to store employee data.
- Sets up a Lambda function to populate the database with sample data.
- Outputs the database cluster ARN and secret ARN for use in the agent stack.

<h3>2. Agent Creation (AgentWithFunctionDefinitionStack)</h3>

- Defines the agent using `AgentDefinitionBuilder`:
  - Sets the agent name, instructions, and foundation model.
- Creates an `AgentActionGroup` with two function definitions:
  - `get_available_vacation_days`: Retrieves available vacation days for an employee.
  - `reserve_vacation_time`: Books vacation time for an employee.
- Sets up a Lambda function to handle these actions, connecting to the Aurora database.

<h3>3. BedrockAgentBlueprintsConstruct</h3>

This custom construct simplifies the process of creating agents for Amazon Bedrock. It handles:

- Knowledge base association and management
- Action group configuration
- S3 asset management for schemas and other files
- IAM role and policy setup for the agent
- Agent creation and configuration

<h2>How It Works</h2>

1. The HRAssistDataStack is automatically deployed as a dependency of the AgentWithFunctionDefinitionStack, creating the database and populating it with sample data.
2. The AgentWithFunctionDefinitionStack is then deployed, using the BedrockAgentBlueprintsConstruct to:
   - Create the Bedrock Agent with the defined functions
   - Set up necessary IAM roles and policies
   - Configure action groups and knowledge bases (if any)
   - Handle S3 asset management for schemas
3. When invoked, the agent uses the function definitions to guide its conversation with the user, ensuring it collects all required information before interacting with the database through the Lambda function to perform HR-related tasks.

<h2>Key Features</h2>

- Implements function definitions for precise control over agent actions and user interactions
- Uses AWS CDK for infrastructure as code with automated stack dependencies
- Leverages Amazon Aurora Serverless for scalable database storage
- Utilizes AWS Lambda for serverless execution of database operations
- Employs a reusable construct (BedrockAgentBlueprintsConstruct) for simplified agent creation

For more detailed information on Agents for Amazon Bedrock function definitions, please refer to the provided documentation and the [official AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html){:target="\_blank"}.
