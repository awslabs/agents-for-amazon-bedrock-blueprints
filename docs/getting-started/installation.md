1. Create a new CDK project or navigate to an existing one.    
2. Install the `BedrockAgentBlueprintsConstruct` package:

```
npm install @aws-samples/agents-for-amazaon-bedrock-blueprints
```

<h2>How to use Agent Blueprint?</h2>

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