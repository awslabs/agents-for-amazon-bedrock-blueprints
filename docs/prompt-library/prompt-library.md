This page contains a collection of prompts that you can use as is or design your own prompts that can be used with the agent-blueprint. The prompts listed here are essential components of the library, enabling various functionalities.

<h3>Using the Prompts</h3>

Users can view and utilize the full prompts by visiting the GitHub repository or cloning it locally. The prompts are available in the `prompt-library` folder within the repository.

To access the prompts:

1. Visit the GitHub repository: [Link to GitHub repository](https://github.com/aws-samples/amazon-bedrock-samples/tree/main/agents-for-bedrock/agent-blueprint-templates/lib/prompt_library){:target="\_blank"}
2. Navigate to the prompt that you are interested in.
3. Copy the desired prompt or clone the repository to your local machine.

<h3>Prompt Summaries</h3>
Feel free to explore and utilize these prompts in your projects or modify them according to your requirements.

<details>
<summary>Example Code Snippet Using a Prompt</summary>

```ts
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AgentDefinitionBuilder,
  PromptType,
} from "../../agents-for-amazon-bedrock-blueprints/lib/constructs/AgentDefinitionBuilder";
import { BedrockAgentBlueprintsConstruct } from "../../agents-for-amazon-bedrock-blueprints/lib/constructs/BedrockAgentBlueprintsConstruct";
import * as bedrock from "aws-cdk-lib/aws-bedrock";

import { claude3SonnetPromptInjectionOrchestrationPrompt } from "../../amazon-bedrock-samples/agents-for-bedrock/agent-blueprint-templates/lib/prompt_library/prompt-injection-mitigation-prompts";

export class MyCdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const prompt: bedrock.CfnAgent.PromptConfigurationProperty = {
      promptType: PromptType.ORCHESTRATION,
      promptCreationMode: "OVERRIDDEN",
      inferenceConfiguration: {
        maximumLength: 2048,
        stopSequences: ["\n\nHuman:"],
        temperature: 0,
        topK: 250,
        topP: 1,
      },
      basePromptTemplate: claude3SonnetPromptInjectionOrchestrationPrompt,
    };

    const agentDef = new AgentDefinitionBuilder(this, "NewAgentDef", {})
      .withAgentName("NewFriendlyAgent")
      .withInstruction("nice new fun agent to do great things in code")
      .withUserInput()
      .withOrchestrationPrompt(prompt)
      .withFoundationModel("anthropic.claude-3-sonnet-20240229-v1:0")
      .build();

    new BedrockAgentBlueprintsConstruct(this, "AmazonBedrockAgentBlueprintsStack", {
      agentDefinition: agentDef,
    });
  }
}
```

</details>

<h4> prompts.ts </h4>

1. <h4>customPreprocessingPrompt</h4>
   This prompt is used to categorize user inputs into different categories based on their nature and intent. It helps filter out malicious or harmful inputs, inputs trying to manipulate the agent's behavior, inputs that the agent cannot answer, inputs that can be answered by the agent, inputs that are answers to the agent's questions, and inputs with multiple questions.

2. <h4>orchestrationPrompt</h4>
   This prompt is the main orchestration prompt that guides the agent in answering user questions. It provides instructions on how to call the available functions, think through the question, extract data, ask for missing information, provide the final answer, and handle specific scenarios like knowledge base usage and code interpretation.

3. <h4>kbResponseGenerationPrompt</h4>
   This prompt is used by the agent to generate an answer based on the provided search results. The agent must use only the information from the search results to answer the user's question and provide citations for the sources used.

4. <h4>customPostProcessingPrompt</h4>
   This prompt is used to provide additional context to the agent's response, making it more understandable for the user. It helps explain the actions taken by the agent without revealing implementation details or function names.

<h4> prompt-injection-mitigation-prompts.ts </h4>

These prompts add additional instructions that can help mitigate prompt injection attacks. For more information, see: [Prompt injection security](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-injection.html){:target="\_blank"}

1. <h4>claude3SonnetPromptInjectionOrchestrationPrompt</h4>
   This prompt is for mitigating prompt injection attacks on the Claude 3 Sonnet model.

2. <h4>claude3HaikuPromptInjectionOrchestrationPrompt</h4>
   This prompt is for mitigating prompt injection attacks on the Claude 3 Haiku model.

3. <h4>titanTextPremierPromptInjectionOrchestrationPrompt</h4>
   This prompt is for mitigating prompt injection attacks on the Amazon Titan Text G1 - Premier model.
