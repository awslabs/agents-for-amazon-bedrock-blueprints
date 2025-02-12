import { App, aws_bedrock as bedrock } from "aws-cdk-lib";
import {
  AgentDefinitionBuilder,
  PromptType,
  PromptConfig_Override,
  PromptConfig_Default,
  PromptStateConfig,
} from "../../lib/constructs/AgentDefinitionBuilder";
import { USER_INPUT_ACTION_NAME, USER_INPUT_PARENT_SIGNATURE } from "../../lib/utilities/constants";

describe("AgentDefinitionBuilder", () => {
  let builder: AgentDefinitionBuilder;
  let app: App;
  const agentName = "MyAgent";
  const instruction = "This is a test instruction. Agent should be chill and relaxed";

  beforeEach(() => {
    app = new App();
    builder = new AgentDefinitionBuilder(app, "TestAgent", {});
  });

  it("should throw an error if agent name is not provided", () => {
    expect(() => builder.build()).toThrowError("Agent name is required");
  });

  it("should throw an error if instruction is not provided", () => {
    builder.withAgentName("TestAgent");
    expect(() => builder.build()).toThrowError("Instruction is required");
  });

  it("should set defaults correctly", () => {
    builder.withAgentName(agentName).withInstruction(instruction);
    const agentDefinition = builder.build();
    expect(agentDefinition.agentName).toEqual(agentName);
    expect(agentDefinition.foundationModel).toEqual("anthropic.claude-v2");
    expect(agentDefinition.idleSessionTtlInSeconds).toEqual(1200);
  });

  it("should set fields correctly", () => {
    const roleArn = "arn:aws:iam::123456789012:role/MyRole";
    const keyArn = "arn:aws:kms:us-west-2:123456789012:key/abcd1234-ef56-gh78-ij90-klmnopqrstu1";
    const model = "my-custom-model";
    const ttl = 300;
    const tags = { key1: "value1", key2: "value2" };
    builder
      .withAgentName(agentName)
      .withInstruction(instruction)
      .withAgentResourceRoleArn(roleArn)
      .withCustomerEncryptionKeyArn(keyArn)
      .withFoundationModel(model)
      .withIdleSessionTtlInSeconds(ttl)
      .withTags(tags)
      .withTestAliasTags(tags);
    const agentDefinition = builder.build();
    expect(agentDefinition.customerEncryptionKeyArn).toEqual(keyArn);
    expect(agentDefinition.instruction).toEqual(instruction);
    expect(agentDefinition.agentResourceRoleArn).toEqual(roleArn);
    expect(agentDefinition.foundationModel).toEqual(model);
    expect(agentDefinition.idleSessionTtlInSeconds).toEqual(ttl);
    expect(agentDefinition.tags).toEqual(tags);
    expect(agentDefinition.testAliasTags).toEqual(tags);
  });

  it("should throw an error if override lambda is not provided for OVERRIDDEN parser mode", () => {
    const prompt: bedrock.CfnAgent.PromptConfigurationProperty = {
      promptType: PromptType.PRE_PROCESSING,
      parserMode: PromptConfig_Override,
      promptCreationMode: PromptConfig_Override,
      basePromptTemplate: "This is a test prompt",
    };
    builder.withAgentName(agentName).withInstruction(instruction).withPreprocessingPrompt(prompt);
    expect(() => builder.build()).toThrowError(
      "`overrideLambda` field must be set in `promptOverrideConfigurations` if `parserMode` is set to `OVERRIDDEN`"
    );
  });

  it("should throw an error if same prompt type is redefined", () => {
    const prompt: bedrock.CfnAgent.PromptConfigurationProperty = {
      promptType: PromptType.PRE_PROCESSING,
      promptCreationMode: PromptConfig_Default,
      basePromptTemplate: "This is a test prompt",
    };
    builder.withAgentName(agentName).withInstruction(instruction).withPreprocessingPrompt(prompt);
    expect(() => builder.withPreprocessingPrompt(prompt)).toThrowError(
      "PRE_PROCESSING is already defined for this agent definition"
    );
  });

  it("should set prompt override configurations correctly", () => {
    const prompt: bedrock.CfnAgent.PromptConfigurationProperty = {
      promptType: PromptType.PRE_PROCESSING,
      promptCreationMode: PromptConfig_Default,
      basePromptTemplate: "This is a test prompt",
    };
    const lambdaArn = "arn:aws:lambda:us-west-2:123456789012:function:MyFunction";
    builder
      .withAgentName(agentName)
      .withInstruction(instruction)
      .withPreprocessingPrompt(prompt)
      .withPromptParserOverride(lambdaArn);
    const agentDefinition = builder.build();
    const prompts = agentDefinition.promptOverrideConfiguration as bedrock.CfnAgent.PromptOverrideConfigurationProperty;
    expect(prompts.promptConfigurations).toContainEqual(prompt);
    expect(prompts.overrideLambda).toEqual(lambdaArn);
  });

  it("should add user input action group correctly", () => {
    builder.withAgentName(agentName).withInstruction(instruction).withUserInput();
    const agentDefinition = builder.build();
    expect(agentDefinition.actionGroups).toContainEqual({
      actionGroupName: USER_INPUT_ACTION_NAME,
      actionGroupState: PromptStateConfig.ENABLED,
      parentActionGroupSignature: USER_INPUT_PARENT_SIGNATURE,
    });
  });
});
