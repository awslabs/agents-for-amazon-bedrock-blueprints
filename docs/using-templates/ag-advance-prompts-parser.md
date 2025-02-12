<h1>Agent with Custom Lambda Parser</h1>

This Agent Blueprint demonstrates how to create an HR Assistant Agent using Amazon Bedrock, AWS CDK, and the `BedrockAgentBlueprintsConstruct`. It showcases the power of using a custom Lambda function for parsing agent responses, enabling advanced processing and customization of the agent's output.

<h2>Quick Start: Deploying the Agent Blueprint</h2>

To deploy this Agent Blueprint:

1. Ensure you have the AWS CDK installed and configured.
2. Clone the [repository](https://github.com/aws-samples/amazon-bedrock-samples){:target="\_blank"} containing these stacks and the BedrockAgentBlueprintsConstruct.
3. Run the below code:

```deploy_stack.ts
cdk deploy AgentWithCustomLambdaParserStack
```

This single command will automatically deploy both the HRAssistDataStack and the AgentWithCustomLambdaParserStack in the correct order, thanks to the dependency condition set up in your CDK code.

After deployment, you can interact with the agent through the Amazon Bedrock console or API to manage employee vacation time.

<h2>What is a Custom Lambda Parser?</h2>

Amazon Bedrock Agents allow you to customize the parsing of agent responses using a Lambda function. This feature enables advanced processing and transformation of the agent's output before it is returned to the user.

In this blueprint, we create a custom Lambda function (`CustomParserFunction`) and associate it with the agent definition using the `withPromptParserOverride` method. This Lambda function will be invoked by the Bedrock service whenever the agent generates a response, allowing you to modify or enhance the output as needed.

Some potential use cases for a custom Lambda parser include:

1. **Formatting and Styling**: Apply custom formatting, styling, or markup to the agent's response.
2. **Data Enrichment**: Enrich the response with additional data or metadata from external sources.
3. **Content Filtering**: Filter or redact sensitive information from the agent's output.
4. **Language Translation**: Translate the agent's response to a different language.
5. **Response Validation**: Validate the agent's response against predefined rules or constraints.

By leveraging a custom Lambda parser, you can tailor the agent's output to meet your specific requirements, ensuring a seamless and optimized user experience.

<h2>Overview</h2>

The blueprint consists of two main stacks and a custom construct, with an automated deployment process:

1. **HRAssistDataStack**: Sets up the database infrastructure.
2. **AgentWithCustomLambdaParserStack**: Creates the Bedrock Agent with a custom Lambda parser.
3. **BedrockAgentBlueprintsConstruct**: A reusable construct for creating Bedrock Agents.

<h2>Key Components</h2>

<h3>1. Database Setup (HRAssistDataStack)</h3>

- Creates an Aurora Serverless PostgreSQL database to store employee data.
- Sets up a Lambda function to populate the database with sample data.
- Outputs the database cluster ARN and secret ARN for use in the agent stack.

<h3>2. Agent Creation (AgentWithCustomLambdaParserStack)</h3>

- Defines the agent using `AgentDefinitionBuilder`:
  - Sets the agent name, instructions, and foundation model.
  - Configures pre-processing and post-processing prompts with custom templates.
  - Associates the custom Lambda parser function for response parsing.
- Creates an `AgentActionGroup` with two function definitions:
  - `get_available_vacation_days`: Retrieves available vacation days for an employee.
  - `reserve_vacation_time`: Books vacation time for an employee.
- Sets up a Lambda function to handle these actions, connecting to the Aurora database.
- Creates a custom AWS CloudFormation resource to execute the custom parser Lambda function.

<h3>3. BedrockAgentBlueprintsConstruct</h3>

This custom construct simplifies the process of creating agents for Amazon Bedrock. It handles:

- Knowledge base association and management
- Action group configuration
- S3 asset management for schemas and other files
- IAM role and policy setup for the agent
- Agent creation and configuration

<h2>How It Works</h2>

1. The HRAssistDataStack is automatically deployed as a dependency of the AgentWithCustomLambdaParserStack, creating the database and populating it with sample data.
2. The AgentWithCustomLambdaParserStack is then deployed, using the BedrockAgentBlueprintsConstruct to:
   - Create the Bedrock Agent with the defined functions and custom Lambda parser
   - Set up necessary IAM roles and policies
   - Configure action groups and knowledge bases (if any)
   - Handle S3 asset management for schemas
3. When invoked, the agent generates a response based on the user's input and the defined instructions.
4. The Bedrock service invokes the custom Lambda parser function, passing the agent's response as input.
5. The custom Lambda parser function processes the response according to your custom logic and returns the modified output.
6. The modified response is then returned to the user.

<h2>Key Features</h2>

- Implements a custom Lambda function for advanced parsing and transformation of agent responses
- Uses AWS CDK for infrastructure as code with automated stack dependencies
- Leverages Amazon Aurora Serverless for scalable database storage
- Utilizes AWS Lambda for serverless execution of database operations and custom parsing
- Employs a reusable construct (BedrockAgentBlueprintsConstruct) for simplified agent creation
- Supports pre-processing and post-processing prompts with custom templates

For more detailed information on Agents for Amazon Bedrock custom Lambda parsers, please refer to the provided documentation and the [official AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html){:target="\_blank"}.
