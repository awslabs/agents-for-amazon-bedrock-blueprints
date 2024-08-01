The `BedrockAgentBlueprintsConstruct` provides several customization options:

### Opt-out of creating resources for knowledge base(KB)

Users can choose to opt-out of creating KB resources as it may become expensive to deploy the AOSS clusters for KB. If any templates initializes KB, you can skip KB creation by adding a flag skipKBCreation in the CDK context.

Example:
```
cdk synth <STACK_NAME> --context skipKBCreation=true
```

### IAM Role Management
The `BedrockAgentBlueprintsConstruct` can automatically create and manage an IAM role for your Bedrock agent if you don't provide one. If you don't specify an `agentResourceRoleArn` in the `AgentDefinitionBuilder`, the construct will create a new IAM role with the necessary permissions for your agent. It will add required permissions for the ActionGroup invocation, FoundationModel access, KB access etc.

However, if you prefer to use an existing IAM role, you can provide the ARN of that role using the `withAgentResourceRoleArn()` method in the `AgentDefinitionBuilder`.

This also adds a resource policy to the Lambda functions associated with the provided action groups. The permission allows the 'bedrock.amazonaws.com' service principal to invoke the Lambda function, using the agent's ARN as the source ARN. This ensures that the Bedrock service can invoke the Lambda functions associated with the agent's action groups

### Asset bucket management
The `BedrockAgentBlueprintsConstruct` automatically creates and manages Amazon S3 buckets for storing the contents of your knowledge bases and action groups. When you define a knowledge base using the `AgentKnowledgeBase`construct and add files from local store and/or when you use a file for defining schema for an action group using the `AgentActionGroup` construct, the `BedrockAgentBlueprintsConstruct` creates an S3 bucket and uploads the specified asset files to it under separate folders. 
This feature simplifies the management of your agent's assets and ensures that they are securely stored and easily accessible by the corresponding AWS services. 