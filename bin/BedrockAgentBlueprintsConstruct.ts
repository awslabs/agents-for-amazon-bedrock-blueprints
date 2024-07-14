import { StackProps, aws_bedrock as bedrock } from 'aws-cdk-lib';
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { v4 as uuidv4 } from 'uuid';

export interface BedrockAgentBlueprintsConstructProps extends StackProps {
    agentDefinition: bedrock.CfnAgentProps;
}

export class BedrockAgentBlueprintsConstruct extends Construct {
    agent: bedrock.CfnAgent;
    agentDefinition: bedrock.CfnAgentProps;
    agentServiceRole: Role;
    constructor(scope: Construct, id: string, props: BedrockAgentBlueprintsConstructProps) {
        super(scope, id);
        this.agentDefinition = props.agentDefinition;
        this.createBedrockAgent();
    }

    /** Agent functions */

    private createBedrockAgent() {
        // Check if role is provided else create a role
        if (!this.agentDefinition.agentResourceRoleArn) {
            this.agentServiceRole = this.setupIAMRole();
        }
        this.agent = new bedrock.CfnAgent(this, `AgentBlueprint-${this.agentDefinition.agentName}`, this.agentDefinition);
    }

    /**
     * Create an IAM Service role for the agent to use to access FM, Artifacts, Actions and KB.
     * @returns IAM Role with required permissions.
     */
    private setupIAMRole(): Role {
        const region = process.env.CDK_DEFAULT_REGION!;
        const accountId = process.env.CDK_DEFAULT_ACCOUNT!;
        // Setup service role that allows bedrock to assume this role
        const bedrockServiceRole = new Role(this, 'BedrockServiceRole', {
            assumedBy: new ServicePrincipal('bedrock.amazonaws.com', {
                conditions: {
                    StringEquals: {
                        'aws:SourceAccount': accountId,
                    },
                },
            }),
            roleName: `AmazonBedrockExecutionRoleForAgents_${uuidv4().slice(0, 12)}`,
            description: 'Service role for Amazon Bedrock',
        });

        // Attach the necessary model invocation permission
        const modelUsed = this.agentDefinition.foundationModel;
        bedrockServiceRole.addToPolicy(
            new PolicyStatement({
                sid: 'AllowModelInvocationForOrchestration',
                effect: Effect.ALLOW,
                actions: ['bedrock:InvokeModel'],
                resources: [
                    `arn:aws:bedrock:${region}::foundation-model/${modelUsed}`,
                ],
            })
        );

        // Recreate the agentDefinition with the new Role created.
        this.agentDefinition = {
            ...this.agentDefinition,
            agentResourceRoleArn: bedrockServiceRole.roleArn,
        };

        return bedrockServiceRole;

    }
}