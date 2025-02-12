<h1>Agent Blueprint with Return of Control</h1>

This Agent Blueprint demonstrates how to create an HR Assistant Agent using Amazon Bedrock, AWS CDK, and the `BedrockAgentBlueprintsConstruct`. It showcases the "Return of Control" feature, which allows the agent to gather information from the user and then return control to the developer for further processing.

<h2>Quick Start: Deploying the Agent Blueprint</h2>

To deploy this Agent Blueprint:

1. Ensure you have the AWS CDK installed and configured.
2. Clone the [repository](https://github.com/aws-samples/amazon-bedrock-samples){:target="\_blank"} containing these stacks and the BedrockAgentBlueprintsConstruct.
3. Run the below code:

```deploy_stack.ts
cdk deploy AgentWithROCStack
```

This command will deploy the AgentWithROCStack, creating the Bedrock Agent and associated resources.

After deployment, you can interact with the agent through the Amazon Bedrock console or API to manage employee vacation time. The agent will gather the necessary information from the user and then return control to the developer for further processing.

<h2>What is Return of Control?</h2>

The "Return of Control" feature in Amazon Bedrock Agents allows the agent to collect information from the user and then return control to the developer for further processing, instead of directly executing an action. This is useful when you want to perform additional logic or validation on the collected data before taking an action.

In our HR Assistant Agent, we define functions like `reserve_vacation_time` with parameters such as:

- `employee_id` (integer, required)
- `start_date` (string, required)
- `end_date` (string, required)

The agent will guide the conversation to collect these parameters from the user. Instead of directly executing the action, the agent will return the collected information to the developer, who can then perform additional processing or validation before confirming the vacation reservation.

For more details on this feature, refer to the [Amazon Bedrock documentation on action group executors](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-action-group-executor.html){:target="\_blank"}.

<h2>Overview</h2>

The blueprint consists of two main stacks and a custom construct:

1. **AgentWithROCStack**: Creates the Bedrock Agent with function definitions and the "Return of Control" feature.
2. **FargateAppStack**: Deploys a Fargate service with a Flask application to handle the returned control from the agent.
3. **BedrockAgentBlueprintsConstruct**: A reusable construct for creating Bedrock Agents.

<h2>Key Components</h2>

<h3>1. Agent Creation (AgentWithROCStack)</h3>

- Defines the agent using `AgentDefinitionBuilder`:
  - Sets the agent name, instructions, and foundation model.
- Creates an `AgentActionGroup` with two function definitions:
  - `get_available_vacation_days`: Retrieves available vacation days for an employee.
  - `reserve_vacation_time`: Collects information to reserve vacation time for an employee.
- Configures the action group executor to use the "RETURN_CONTROL" option, which returns the collected information to the developer instead of executing an action.

<h3>2. Flask Application (FargateAppStack)</h3>

- Creates an ECS Fargate service running a Flask application.
- The Flask application handles the returned control from the agent and performs additional processing or validation on the collected data.
- After processing, the application can take the appropriate action, such as confirming the vacation reservation in the database.

<h3>3. BedrockAgentBlueprintsConstruct</h3>

This custom construct simplifies the process of creating agents for Amazon Bedrock. It handles:

- Knowledge base association and management
- Action group configuration
- S3 asset management for schemas and other files
- IAM role and policy setup for the agent
- Agent creation and configuration

<h2>How It Works</h2>

1. The AgentWithROCStack is deployed, creating the Bedrock Agent with the defined functions and the "Return of Control" feature.
2. The FargateAppStack is deployed, creating an ECS Fargate service running a Flask application.
3. When invoked, the agent uses the function definitions to guide its conversation with the user, ensuring it collects all required information.
4. Instead of executing an action directly, the agent returns the collected information to the developer.
5. The Flask application running on the Fargate service receives the returned control and performs additional processing or validation on the collected data.
6. After processing, the Flask application can take the appropriate action, such as confirming the vacation reservation in the database.

<h2>Key Features</h2>

- Implements the "Return of Control" feature for additional processing and validation
- Uses AWS CDK for infrastructure as code
- Leverages Amazon ECS and Fargate for running the Flask application
- Employs a reusable construct (BedrockAgentBlueprintsConstruct) for simplified agent creation
- Separates the agent logic from the application logic, allowing for more flexibility and extensibility

For more detailed information on Agents for Amazon Bedrock, the "Return of Control" feature, please refer to the provided documentation and the [official AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html){:target="\_blank"}.
