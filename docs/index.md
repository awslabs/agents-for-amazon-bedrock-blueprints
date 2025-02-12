Agent Blueprints for Amazon Bedrock aims to simplify the process of creating and deploying [Agents for Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html){:target="\_blank"}, leveraging the power of [AWS CDK (Cloud Development Kit)](https://docs.aws.amazon.com/cdk/v2/guide/home.html){:target="\_blank"} and <b>`agent-blueprints`</b> [NPM module](https://www.npmjs.com/package/@aws/agents-for-amazon-bedrock-blueprints){:target="\_blank"}. Agent Blueprints are written in <b>`TypeScript`</b>, providing type safety and enhanced developer experience.

## What are Agent Blueprints?

Agent Blueprints are pre-configured templates designed to accelerate the development of `Agents for Amazon Bedrock`. These blueprints offer a streamlined approach to creating intelligent agents by providing optimized configurations and best practices tailored to specific use cases. By leveraging Agent Blueprints, developers can significantly reduce the time and effort required to build functional agents, allowing them to focus on fine-tuning and customizing the agent for their specific needs rather than starting from scratch.

Each blueprint comes with predefined configurations, sample actions, and knowledge bases, making it easy for developers to experiment and learn about agent capabilities. Additionally, Agent Blueprints provide access to AWS-developed, use-case specific prompts that can save months of prompt engineering effort. This combination of ready-to-use templates and customizable components enables developers to quickly deploy sophisticated agents while maintaining the flexibility to adapt them to unique requirements.

<h2>Why should I use Agent Blueprints?</h2>
Agent Blueprints provide a flexible and streamlined approach to building agents for Amazon Bedrock, catering to different levels of customization and development effort. Whether you want to create a custom agent from scratch using **constructs** or quickly deploy a pre-built **template**.

## Key Features and Benefits

- **Curated, Pre-built Templates**: A collection of templates optimized for popular use-case patterns among Amazon Bedrock customers.
- **AWS CDK Integration**: Utilize AWS CDK to define your agent infrastructure as code.
- **Usecase Specific Configurations**: Each blueprint comes with predefined configurations that you can use as-is or customize to your specific needs.
- **Sample Actions and Knowledge Bases**: Pre-configured examples that make it easy to experiment and learn about agent capabilities.
- **Customized Prompts**: Access to AWS-developed, use-case specific prompts that save months of prompt engineering effort.
- **Easy to Follow Documentation**: Each blueprint includes a documentation guide with step-by-step instructions for implementation.
- **Flexibility**: Easily modify and extend blueprints to meet your unique requirements.
- **NPM Package**: Core constructs are available as an NPM package for seamless integration into your projects.
- **Open Source Blueprints**: Access a growing library of blueprints via our GitHub repository.
- **Cost Effective**: Agent Blueprints are free to use; you only pay for the Amazon Bedrock resources you create and use.
- **Rapid Development**: Reduce development time from weeks to hours.
- **Best Practices**: Leverage optimized configurations and industry best practices.

Regardless of the approach you choose, Agent Blueprints ensures a smooth development experience.

<h2>How It Works</h2>
Agent Blueprints for Amazon Bedrock has two main components to help you build agents:

1. **Constructs**: These are reusable building blocks that allow you to create a custom agent templates with specific configurations and options.

2. **Templates**: These are pre-built agent templates that cover some of the most common use cases for Amazon Bedrock agents. These templates are ready to use, and can help create an agent in just a few minutes.

**Using Constructs to Build Agents**
This flow is ideal to create a custom agent template with specific options and configurations. Use the provided constructs as building blocks to define agent's infrastructure, actions, knowledge bases, and other components. This approach offers more flexibility and customization. To learn more about using constructs to build Agents for Amazon Bedrock, click [here](./using-constructs/getting-started-with-constructs.md).

**Using Templates to Build Agents**
This flow is ideal to quickly create an agent for Amazon Bedrock based on some of the most common use cases. The pre-built templates are ready to use, and you can have an agent up and running in just a few minutes. These templates are ready to use and they provide a great starting point to deploy an agent quickly. To learn more about using templates to build Agents for Amazon Bedrock, click [here](./using-templates/getting-started-with-templates.md).

**Example Templates**:
To view a library of blueprint examples, see our [Blueprints Patterns Repository](https://github.com/aws-samples/amazon-bedrock-samples/tree/main/agents-for-bedrock/agent-blueprint-templates){:target="\_blank"}.
