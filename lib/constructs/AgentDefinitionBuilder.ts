import { aws_bedrock as bedrock } from "aws-cdk-lib";
import { Construct } from "constructs";
import { USER_INPUT_ACTION_NAME, USER_INPUT_PARENT_SIGNATURE } from "../utilities/constants";

export interface TagsConfig {
  [key: string]: string;
}

export interface AgentDefinitionProps {
  agentName?: string;
  instruction?: string;
  agentResourceRoleArn?: string;
  customerEncryptionKeyArn?: string;
  description?: string;
  foundationModel?: string;
  idleSessionTtlInSeconds?: number;
  tags?: TagsConfig;
  testAliasTags?: TagsConfig;
  /**
   * For additional properties that might not be supported by blueprints but available for CfnAgent.
   */
  [key: string]: any;
}

export enum PromptType {
  PRE_PROCESSING = "PRE_PROCESSING",
  ORCHESTRATION = "ORCHESTRATION",
  KNOWLEDGE_BASE_RESPONSE_GENERATION = "KNOWLEDGE_BASE_RESPONSE_GENERATION",
  POST_PROCESSING = "POST_PROCESSING",
}

export enum PromptStateConfig {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}

export const PromptConfig_Override = "OVERRIDDEN";
export const PromptConfig_Default = "DEFAULT";

export class AgentDefinitionBuilder extends Construct {
  private agentDefinition: bedrock.CfnAgentProps;
  private overrideLambda: string;
  private promptConfigurations: bedrock.CfnAgent.PromptConfigurationProperty[] = [];

  constructor(scope: Construct, id: string, props: AgentDefinitionProps) {
    super(scope, id);
    this.agentDefinition = {
      agentName: props.agentName ?? "",
      instruction: props.instruction ?? "",
      description: props.description,
      agentResourceRoleArn: props.agentResourceRoleArn,
      customerEncryptionKeyArn: props.customerEncryptionKeyArn,
      foundationModel: props.foundationModel ?? "anthropic.claude-v2",
      idleSessionTtlInSeconds: props.idleSessionTtlInSeconds ?? 1200,
      tags: props.tags ?? {},
      testAliasTags: props.testAliasTags ?? {},
    };
  }

  public build(): bedrock.CfnAgentProps {
    if (!this.agentDefinition.agentName) {
      throw new Error("Agent name is required");
    }
    if (!this.agentDefinition.instruction) {
      throw new Error("Instruction is required");
    }
    // Add prompt configs if present:
    if (this.promptConfigurations || this.overrideLambda) {
      // Validate if parserMode is set for any prompt then override lambda is also set.
      if (this.promptConfigurations?.some((p) => p.parserMode === PromptConfig_Override) && !this.overrideLambda) {
        throw new Error(
          "`overrideLambda` field must be set in `promptOverrideConfigurations` if `parserMode` is set to `OVERRIDDEN`"
        );
      }

      this.agentDefinition = {
        ...this.agentDefinition,
        promptOverrideConfiguration: {
          promptConfigurations: this.promptConfigurations,
          overrideLambda: this.overrideLambda,
        },
      };
    }
    return this.agentDefinition;
  }

  public withAgentName(agentName: string) {
    this.agentDefinition = {
      ...this.agentDefinition,
      agentName: agentName,
    };
    return this;
  }

  public withInstruction(instruction: string) {
    this.agentDefinition = {
      ...this.agentDefinition,
      instruction: instruction,
    };
    return this;
  }

  /**
   * @note If a role is specified during definition, the construct will not add
   * any permissions for action groups or KBs.
   * @param roleArn
   * @returns
   */
  public withAgentResourceRoleArn(roleArn: string) {
    this.agentDefinition = {
      ...this.agentDefinition,
      agentResourceRoleArn: roleArn,
    };
    return this;
  }

  public withCustomerEncryptionKeyArn(keyArn: string) {
    this.agentDefinition = {
      ...this.agentDefinition,
      customerEncryptionKeyArn: keyArn,
    };
    return this;
  }

  public withFoundationModel(model: string) {
    //TODO: Add validations for model
    this.agentDefinition = {
      ...this.agentDefinition,
      foundationModel: model,
    };
    return this;
  }

  public withIdleSessionTtlInSeconds(timeout: number) {
    this.agentDefinition = {
      ...this.agentDefinition,
      idleSessionTtlInSeconds: timeout,
    };
    return this;
  }

  public withPreprocessingPrompt(prompt: bedrock.CfnAgent.PromptConfigurationProperty) {
    this.validatePrompt(prompt, PromptType.PRE_PROCESSING);
    this.promptConfigurations.push(prompt);
    return this;
  }

  public withOrchestrationPrompt(prompt: bedrock.CfnAgent.PromptConfigurationProperty) {
    this.validatePrompt(prompt, PromptType.ORCHESTRATION);
    this.promptConfigurations.push(prompt);
    return this;
  }

  public withKBResponseGenerationPrompt(prompt: bedrock.CfnAgent.PromptConfigurationProperty) {
    this.validatePrompt(prompt, PromptType.KNOWLEDGE_BASE_RESPONSE_GENERATION);
    this.promptConfigurations.push(prompt);
    return this;
  }

  public withPostProcessingPrompt(prompt: bedrock.CfnAgent.PromptConfigurationProperty) {
    this.validatePrompt(prompt, PromptType.POST_PROCESSING);
    this.promptConfigurations.push(prompt);
    return this;
  }

  public withPromptParserOverride(lambdaArn: string) {
    // Lambda arn Pattern from https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html
    const supportedLambdaPattern =
      /^arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}(-gov)?-[a-z]+-\d{1}:\d{12}:function:[a-zA-Z0-9-_.]+(:(\$LATEST|[a-zA-Z0-9-_]+))?$/;

    // Validate lambda ARN:
    supportedLambdaPattern.test(lambdaArn);

    this.overrideLambda = lambdaArn;
    return this;
  }

  public withTags(tags: TagsConfig) {
    this.agentDefinition = {
      ...this.agentDefinition,
      tags: tags,
    };
    return this;
  }

  public withTestAliasTags(testAliasTags: TagsConfig) {
    this.agentDefinition = {
      ...this.agentDefinition,
      testAliasTags: testAliasTags,
    };
    return this;
  }

  /**
   * To allow agent to request the user for additional information when trying to
   * complete a task, we need to add an action group with the parentActionGroupSignature
   * field set to AMAZON.UserInput.
   * @returns AgentDefinitionBuilder object with a new action set.
   */
  public withUserInput() {
    const userInputAction: bedrock.CfnAgent.AgentActionGroupProperty = {
      actionGroupName: USER_INPUT_ACTION_NAME,
      actionGroupState: "ENABLED",
      parentActionGroupSignature: USER_INPUT_PARENT_SIGNATURE,
    };

    // Append the userInput AG to the agent definition.
    this.agentDefinition = {
      ...this.agentDefinition,
      actionGroups: [userInputAction],
    };
    return this;
  }

  public withAdditionalProps(props: { [key: string]: any }) {
    this.agentDefinition = {
      ...this.agentDefinition,
      ...(props || {}),
    };
    return this;
  }

  private validatePrompt(prompt: bedrock.CfnAgent.PromptConfigurationProperty, expectedPromptType: PromptType) {
    // Check if the prompt contains any values.
    if (Object.keys(prompt).length === 0) {
      throw new Error("All fields passed into this prompt are empty. Please enter valid prompt");
    }

    // Validate baseTemplate is populated if promptCreationMode is overridden.
    if (prompt.promptCreationMode === PromptConfig_Override && !prompt.basePromptTemplate) {
      throw new Error("Please define a `basePromptTemplate` to set `promptCreationMode`");
    }

    // Check if the promptType is set correctly.
    if (!prompt.promptType || prompt.promptType !== expectedPromptType) {
      throw new Error(`Invalid 'promptType', Type must be set to ${expectedPromptType} for adding to overrides`);
    }

    // Check if this type of prompt is already added to the promptOverrideConfigs.
    if (this.promptConfigurations?.some((p) => p.promptType === expectedPromptType)) {
      throw new Error(`${expectedPromptType} is already defined for this agent definition.`);
    }
  }
}
