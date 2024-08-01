**Note:** If you used the [recommended shell script method](./prerequisite.md) to install the prerequisites and the Agent Blueprints package, you can skip the NPM installation step mentioned below. Your environment already has the Agent Blueprints package installed.

To deploy an agent from a template using the shell script helper, follow these steps:

```title="Find and deploy agent templates using shell script"
# List available templates
./blueprints.sh ls 

# Deploy a template
./blueprints.sh deploy <name-of-the-example-stack> 

# Example deployment
./blueprints.sh deploy 01-agent-with-function-definitions
```

<h3>Manual Installation </h3>

If you prefer to install the Agent Blueprints package manually, follow these steps:

1. Create a new CDK project or navigate to an existing one.    
2. Install the `BedrockAgentBlueprintsConstruct` package:

```
npm install @aws-samples/agents-for-amazaon-bedrock-blueprints
```

<h3>How to use Agent Blueprint?</h3>

You can either directly deploy the preconfigured blueprint using CDK or you can optionally extend the blueprint based on your requirements. 

**Using Templates**: These are pre-built agent templates that cover some of the most common use cases for Amazon Bedrock agents. These templates are ready to use, and can help create an agent in just a few minutes.

```ts title="preconfigured-travel-agent.ts"
cdk synth TravelAgentDefaultStack
cdk deploy TravelAgentDefaultStack
```

**Using Constructs**: These are reusable building blocks that allow you to create a custom agent templates with specific configurations and options.

```ts title="customize-preconfigured-travel-agent.ts"
const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack');

// Create an agent with built-in template
const travelAssistant =  buildTravelAssistantAgent();

//If the users want to customize their agent further
const hotelsInfo = new KnowledgeBase(...); 
travelAssistant.addKnowledgeBase(hotelsInfo) // Allows user to add their own resources

//Add the resources to the stack deployment.
```