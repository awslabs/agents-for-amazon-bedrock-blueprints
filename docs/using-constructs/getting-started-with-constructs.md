<h3>Prerequisites</h3>
To configure the environment check [Prerequisite](../getting-started/prerequisite.md) page.

<h3>Installation</h3>
For instructions on installation check [Installation](../getting-started/installation.md) page.

<h3>Key Components for Constructs</h3>
The BedrockAgentBlueprintsConstruct is composed of the following key components:

- **`Agent Definition`**: An AgentDefinitionBuilder is used to define the agent's properties like name, instruction, foundationModel etc. This also allows users to build the agent with different prompts from the library.

- **`Action Groups`**: An AgentActionGroup is a placeholder construct used to define the actions that the agent can perform, and helps in setup of associated Lambda function code and OpenAPI schema.

- **`Knowledge Bases`**: An AgentKnowledgeBase is used to define the knowledge base for the agent, which can include various asset files for the data source. Currently this supports automated creation of an AOSS cluster, deploys the assets to an assets bucket, builds a data source, builds a KB and syncs the data source.

- **`Guardrails`**: The BedrockGuardrailsBuilder construct is a utility class that simplifies the creation of Amazon Bedrock Guardrails. Guardrails are a set of rules and policies that help ensure the safety and compliance of your AI applications.
