import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AgentActionGroup } from '../../../../../agents-for-amazon-bedrock-blueprints/bin/constructs/AgentActionGroup';
import { AgentDefinitionBuilder } from '../../../../../agents-for-amazon-bedrock-blueprints/bin/constructs/AgentDefinitionBuilder';
import { BedrockAgentBlueprintsConstruct } from '../../../../../agents-for-amazon-bedrock-blueprints/bin/BedrockAgentBlueprintsConstruct';


export class AgentWithROCStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);


        const agentDef = new AgentDefinitionBuilder(this, 'HRAssistantAgent', {})
            .withAgentName('hr-assistant-agent-with-ROC')  
            .withInstruction(
                'As an HR agent, your role involves assisting employees with a range of HR tasks. ' +
                'These include managing vacation requests both present and future, ' +
                'reviewing past vacation usage, tracking remaining vacation days, and addressing general HR inquiries. ' +
                'You will rely on contextual details provided by users to fulfill their HR needs efficiently. ' +
                'When discussing dates, always use the YYYY-MM-DD format unless clarified otherwise by the user. ' +
                'If you are unsure about any details, do not hesitate to ask the user for clarification.' +
                'Use "you" to address the user directly, making it more personal and actionable.' +
                'Make sure the responses are direct, straightforward, and do not contain unnecessary information.'
            )
            .withFoundationModel('anthropic.claude-3-sonnet-20240229-v1:0')
            .withUserInput()
            .build();


        // Function definitions that will be associated with the action group invocation 
        const getAvailableVacationDaysFunction = {
            name: 'get_available_vacation_days',
            description: 'Get the number of vacation days available for a certain employee',
            parameters: {
                employee_id: {
                    type: 'integer',
                    description: 'The ID of the employee to get the available vacations',
                    required: true
                }
            }
        };

        const reserveVacataionTimeFunction = {
            name: 'reserve_vacation_time',
            description: 'Reserve vacation time for a specific employee - you need all parameters to reserve vacation time',
            parameters: {
                employee_id: {
                    type: 'integer',
                    description: 'The ID of the employee to reserve the vacation time for',
                    required: true
                },
                start_date: {
                    type: 'integer',
                    description: 'The start date of the vacation time to reserve',
                    required: true
                },
                end_date: {
                    type: 'integer',
                    description: 'The end date of the vacation time to reserve',
                    required: true
                }
            }
        };

        // Create Agent Action Group
        const hrAssistanceAction = new AgentActionGroup(this, 'VacationsActionGroup', {
            actionGroupName: 'VacationsActionGroup',
            description: 'Actions for getting the number of available vacations days for an employee and confirm new time off',
            actionGroupExecutor: {
                customControl: "RETURN_CONTROL" // Instead of sending the information elicited from the user to Lambda for further processing, return the control to agent developer
            },
            schemaDefinition: { 
                functionSchema: {
                    functions: [getAvailableVacationDaysFunction, reserveVacataionTimeFunction]
                }
            },
        });


        new BedrockAgentBlueprintsConstruct(this, 'AmazonBedrockAgentBlueprintsStack', {
            agentDefinition: agentDef,
            actionGroups: [hrAssistanceAction],
        });
    }
}


