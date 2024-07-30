import { App, Stack } from 'aws-cdk-lib';
import {
    BedrockGuardrailsBuilder,
    FilterStrength,
    FilterType,
    ManagedWordsTypes,
    PIIAction,
    PIIType,
} from '../../lib/constructs/BedrockGuardrailsBuilder';
import { CfnGuardrail } from 'aws-cdk-lib/aws-bedrock';
import { Template } from 'aws-cdk-lib/assertions';

describe('BedrockGuardrailsBuilder', () => {
    let app: App;
    let stack: Stack;

    beforeEach(() => {
        app = new App();
        stack = new Stack(app, 'TestStack');
    });

    it('should create a guardrail with default values', () => {
        const guardrailBuilder = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
            name: 'TestGuardrail',
        });
        const guardrail: CfnGuardrail = guardrailBuilder.build();

        expect(guardrail.blockedInputMessaging).toBe('Invalid input. Query violates our usage policy.');
        expect(guardrail.blockedOutputsMessaging).toBe('Unable to process. Query violates our usage policy.');
        expect(guardrail.name).toBe('TestGuardrail');
        expect(guardrail.description).toBeUndefined();
        expect(guardrail.kmsKeyArn).toBeUndefined();
        expect(guardrail.sensitiveInformationPolicyConfig).toBeUndefined();
        expect(guardrail.topicPolicyConfig).toBeUndefined();
        expect(guardrail.wordPolicyConfig).toBeUndefined();
    });

    it('should create a guardrail with custom properties', () => {
        const guardrailBuilder = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
            name: 'TestGuardrail',
            blockedInputMessaging: 'Custom input message',
            blockedOutputsMessaging: 'Custom output message',
            description: 'Test guardrail description',
            kmsKeyArn: 'kmsKeyArn',
        });
        const guardrail = guardrailBuilder.build();

        expect(guardrail.blockedInputMessaging).toBe('Custom input message');
        expect(guardrail.blockedOutputsMessaging).toBe('Custom output message');
        expect(guardrail.name).toBe('TestGuardrail');
        expect(guardrail.description).toBe('Test guardrail description');
        expect(guardrail.kmsKeyArn).toBe('kmsKeyArn');
    });

    it('should create a KMS key when requested', () => {
        const guardrailBuilder = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
            name: 'TestGuardrail',
            generateKmsKey: true,
        });
        const guardrail: CfnGuardrail = guardrailBuilder.build();
        const template = Template.fromStack(stack);
        expect(guardrail.kmsKeyArn).toBeDefined();
        template.resourceCountIs('AWS::KMS::Key', 1);
        template.hasResourceProperties('AWS::KMS::Key', {
            EnableKeyRotation: true
        });
    });

    it('should create a guardrail with all configurations', () => {
        const guardrailBuilder = new BedrockGuardrailsBuilder(stack, 'TestGuardrail', {
            name: 'TestGuardrail',
            description: 'Test guardrail with all configurations',
            generateKmsKey: true,
        })
            .withFiltersConfig(FilterType.VIOLENCE, FilterStrength.HIGH, FilterStrength.MEDIUM)
            .withFiltersConfig(FilterType.SEXUAL, FilterStrength.LOW)
            .withPIIConfig(PIIAction.BLOCK, PIIType.EMAIL)
            .withPIIConfig(PIIAction.ANONYMIZE, PIIType.NAME)
            .withTopicConfig('Politics', 'Discussions related to politics', ['election', 'government'])
            .withManagedWordsConfig(ManagedWordsTypes.PROFANITY)
            .withWordsConfig(['badword1', 'badword2']);
        const guardrail = guardrailBuilder.build();
        const contentPolicyConfig = guardrail.contentPolicyConfig as CfnGuardrail.ContentPolicyConfigProperty;
        const sensitiveInformationPolicyConfig = guardrail.sensitiveInformationPolicyConfig as CfnGuardrail.SensitiveInformationPolicyConfigProperty;
        const topicPolicyConfig = guardrail.topicPolicyConfig as CfnGuardrail.TopicPolicyConfigProperty;
        const wordPolicyConfig = guardrail.wordPolicyConfig as CfnGuardrail.WordPolicyConfigProperty;
      
        expect(contentPolicyConfig.filtersConfig).toHaveLength(2);
        expect(contentPolicyConfig.filtersConfig).toContainEqual({
            type: FilterType.VIOLENCE,
            inputStrength: FilterStrength.HIGH,
            outputStrength: FilterStrength.MEDIUM,
        });
        expect(contentPolicyConfig.filtersConfig).toContainEqual({
            type: FilterType.SEXUAL,
            inputStrength: FilterStrength.LOW,
            outputStrength: FilterStrength.HIGH,
        });
      
        expect(sensitiveInformationPolicyConfig.piiEntitiesConfig).toHaveLength(2);
        expect(sensitiveInformationPolicyConfig.piiEntitiesConfig).toContainEqual({
            type: PIIType.EMAIL,
            action: PIIAction.BLOCK,
        });
        expect(sensitiveInformationPolicyConfig.piiEntitiesConfig).toContainEqual({
            type: PIIType.NAME,
            action: PIIAction.ANONYMIZE,
        });
      
        expect(topicPolicyConfig.topicsConfig).toHaveLength(1);
        expect(topicPolicyConfig.topicsConfig).toContainEqual({
            name: 'Politics',
            definition: 'Discussions related to politics',
            type: 'DENY',
            examples: ['election', 'government'],
        });
      
        expect(wordPolicyConfig.managedWordListsConfig).toHaveLength(1);
        expect(wordPolicyConfig.managedWordListsConfig).toContainEqual({
            type: ManagedWordsTypes.PROFANITY,
        });
      
        expect(wordPolicyConfig.wordsConfig).toHaveLength(2);
        expect(wordPolicyConfig.wordsConfig).toContainEqual({ text: 'badword1' });
        expect(wordPolicyConfig.wordsConfig).toContainEqual({ text: 'badword2' });
    });

});