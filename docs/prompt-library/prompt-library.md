This page contains a collection of prompts that you can use as is or design your own prompts that can be used with the agent-blueprint. The prompts listed here are essential components of the library, enabling various functionalities.

<h3>Using the Prompts</h3>

Users can view and utilize the full prompts by visiting the GitHub repository or cloning it locally. The prompts are available in the `prompts.ts` file within the repository.

To access the prompts:

1. Visit the GitHub repository: [Link to GitHub repository](https://github.com/awslabs/agents-for-amazon-bedrock-blueprints){:target="_blank"}
2. Navigate to the prompt that you are interested in.
3. Copy the desired prompt or clone the repository to your local machine.

<h3>Prompt Summaries</h3>

1. <h4>customPreprocessingPrompt</h4>
This prompt is used to categorize user inputs into different categories based on their nature and intent. It helps filter out malicious or harmful inputs, inputs trying to manipulate the agent's behavior, inputs that the agent cannot answer, inputs that can be answered by the agent, inputs that are answers to the agent's questions, and inputs with multiple questions.

2. <h4>orchestrationPrompt</h4>
This prompt is the main orchestration prompt that guides the agent in answering user questions. It provides instructions on how to call the available functions, think through the question, extract data, ask for missing information, provide the final answer, and handle specific scenarios like knowledge base usage and code interpretation.

3. <h4>kbResponseGenerationPrompt</h4>
This prompt is used by the agent to generate an answer based on the provided search results. The agent must use only the information from the search results to answer the user's question and provide citations for the sources used.

4. <h4>customPostProcessingPrompt</h4>
This prompt is used to provide additional context to the agent's response, making it more understandable for the user. It helps explain the actions taken by the agent without revealing implementation details or function names.

Feel free to explore and utilize these prompts in your projects or modify them according to your requirements.