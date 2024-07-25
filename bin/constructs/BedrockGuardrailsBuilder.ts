import { Key } from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import { DEFAULT_BLOCKED_INPUT_MESSAGE, DEFAULT_BLOCKED_OUTPUT_MESSAGE } from "./utilities/constants";

// Filter Config from https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-guardrail-contentfilterconfig.html#cfn-bedrock-guardrail-contentfilterconfig-type
export enum FilterType {
    VIOLENCE = 'VIOLENCE',
    HATE = 'HATE',
    INSULTS = 'INSULTS',
    MISCONDUCT = 'MISCONDUCT',
    PROMPT_ATTACK = 'PROMPT_ATTACK',
    SEXUAL = 'SEXUAL'
}

export enum FilterStrength {
    NONE = 'NONE',
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
}

export enum PIIAction {
    BLOCK = 'BLOCK',
    ANONYMIZE = 'ANONYMIZE'
}

export enum PIIType {
    ADDRESS = 'ADDRESS',
    AGE = 'AGE',
    AWS_ACCESS_KEY = 'AWS_ACCESS_KEY',
    AWS_SECRET_KEY = 'AWS_SECRET_KEY',
    CA_HEALTH_NUMBER = 'CA_HEALTH_NUMBER',
    CA_SOCIAL_INSURANCE_NUMBER = 'CA_SOCIAL_INSURANCE_NUMBER',
    CREDIT_DEBIT_CARD_CVV = 'CREDIT_DEBIT_CARD_CVV',
    CREDIT_DEBIT_CARD_EXPIRY = 'CREDIT_DEBIT_CARD_EXPIRY',
    CREDIT_DEBIT_CARD_NUMBER = 'CREDIT_DEBIT_CARD_NUMBER',
    DRIVER_ID = 'DRIVER_ID',
    EMAIL = 'EMAIL',
    INTERNATIONAL_BANK_ACCOUNT_NUMBER = 'INTERNATIONAL_BANK_ACCOUNT_NUMBER',
    IP_ADDRESS = 'IP_ADDRESS',
    LICENSE_PLATE = 'LICENSE_PLATE',
    MAC_ADDRESS = 'MAC_ADDRESS',
    NAME = 'NAME',
    PASSWORD = 'PASSWORD',
    PHONE = 'PHONE',
    PIN = 'PIN',
    SWIFT_CODE = 'SWIFT_CODE',
    UK_NATIONAL_HEALTH_SERVICE_NUMBER = 'UK_NATIONAL_HEALTH_SERVICE_NUMBER',
    UK_NATIONAL_INSURANCE_NUMBER = 'UK_NATIONAL_INSURANCE_NUMBER',
    UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER = 'UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER',
    URL = 'URL',
    USERNAME = 'USERNAME',
    US_BANK_ACCOUNT_NUMBER = 'US_BANK_ACCOUNT_NUMBER',
    US_BANK_ROUTING_NUMBER = 'US_BANK_ROUTING_NUMBER',
    US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER = 'US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER',
    US_PASSPORT_NUMBER = 'US_PASSPORT_NUMBER',
    US_SOCIAL_SECURITY_NUMBER = 'US_SOCIAL_SECURITY_NUMBER',
    VEHICLE_IDENTIFICATION_NUMBER = 'VEHICLE_IDENTIFICATION_NUMBER',
}

export enum ManagedWordsTypes {
    PROFANITY = 'PROFANITY'
}

export interface BedrockGuardrailsBuilderProps {

    // The name of the guardrail
    name: string;

    // The message to display when the guardrail blocks an input prompt
    blockedInputMessaging?: string;

    // The message to display when the guardrail blocks a model's output response
    blockedOutputsMessaging?: string;

    // Description of the guardrail
    description?: string;

    // ARN of the AWS KMS key used to encrypt the guardrail
    kmsKeyArn?: string;

    // Enables the construct to create a KMS key on user's behalf. Default is false.
    generateKmsKey?: boolean
}



export class BedrockGuardrailsBuilder extends Construct {

    public guardrailId: string;
    public guardrailVersion: string;
    private guardrailConfigs: bedrock.CfnGuardrailProps;
    private filterConfigs: bedrock.CfnGuardrail.ContentFilterConfigProperty[] = [];
    private piiConfigs: bedrock.CfnGuardrail.PiiEntityConfigProperty[] = [];
    private topicConfigs: bedrock.CfnGuardrail.TopicConfigProperty[] = [];
    private managedWordsConfigs: bedrock.CfnGuardrail.ManagedWordsConfigProperty[] = [];
    private wordsConfig: bedrock.CfnGuardrail.WordConfigProperty[] = [];

    constructor(scope: Construct, id: string, props: BedrockGuardrailsBuilderProps) {
        super(scope, id);

        const kmsKeyArn = props.kmsKeyArn
            ? props.kmsKeyArn
            : props.generateKmsKey
                ? new Key(this, `${props.name}GuardrailsKey`, { enableKeyRotation: true }).keyArn
                : undefined;

        this.guardrailConfigs = {
            blockedInputMessaging: props.blockedInputMessaging ?? DEFAULT_BLOCKED_INPUT_MESSAGE,
            blockedOutputsMessaging: props.blockedOutputsMessaging ?? DEFAULT_BLOCKED_OUTPUT_MESSAGE,
            name: props.name,
            description: props.description,
            kmsKeyArn: kmsKeyArn,
        };
    }

    public withFiltersConfig(filterType: FilterType, inputStrength?: FilterStrength, outputStrength?: FilterStrength) {
        this.filterConfigs.push({
            type: filterType,
            inputStrength: inputStrength ?? FilterStrength.HIGH,
            outputStrength: outputStrength ?? FilterStrength.HIGH,
        });
        return this;
    }

    public withPIIConfig(action: PIIAction, piiType: PIIType) {
        this.piiConfigs.push({
            type: piiType,
            action: action
        });
        return this;
    }

    public withTopicConfig(topicName: string, topicDefinition: string, examples?: string[]) {
        this.topicConfigs.push({
            name: topicName,
            definition: topicDefinition,
            type: 'DENY',
            examples: examples
        });
        return this;
    }

    public withManagedWordsConfig(type: ManagedWordsTypes) {
        this.managedWordsConfigs.push({ type: type });
        return this;
    }

    public withWordsConfig(wordsToBlock: string[]) {
        const wordsToBlockObjects = wordsToBlock.map(word => ({ text: word }));
        // this.wordsConfig.concat(wordsToBlockObjects);
        this.wordsConfig = [...this.wordsConfig, ...wordsToBlockObjects];  // <-- spread operator to concatenate the wordsToBlockObject array with the existing this.wordsConfig array.
        return this;
    }


    public build(): bedrock.CfnGuardrail {
        if (this.filterConfigs.length > 0) {
            this.guardrailConfigs = {
                ...this.guardrailConfigs,
                contentPolicyConfig: {
                    filtersConfig: this.filterConfigs
                }
            };
        }

        if (this.piiConfigs.length > 0) {
            this.guardrailConfigs = {
                ...this.guardrailConfigs,
                sensitiveInformationPolicyConfig: {
                    piiEntitiesConfig: this.piiConfigs
                }
            };
        }

        if (this.topicConfigs.length > 0) {
            this.guardrailConfigs = {
                ...this.guardrailConfigs,
                topicPolicyConfig: {
                    topicsConfig: this.topicConfigs
                }
            };
        }

        if (this.managedWordsConfigs.length > 0 || this.wordsConfig.length > 0) {
            this.guardrailConfigs = {
                ...this.guardrailConfigs,
                wordPolicyConfig: {
                    managedWordListsConfig: this.managedWordsConfigs,
                    wordsConfig: this.wordsConfig
                }
            };
        }

        const guardrail = new bedrock.CfnGuardrail(this, this.guardrailConfigs.name, this.guardrailConfigs);

        this.guardrailVersion = guardrail.attrVersion;
        this.guardrailId = guardrail.attrGuardrailId;

        return guardrail;
    }
}