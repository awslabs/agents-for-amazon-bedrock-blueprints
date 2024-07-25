import { Construct } from "constructs";
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import { Code, Function, FunctionProps, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

/**
 * Interface defines the properties of code to build the lambda function.
 * The constructs will be responsible for permission management.
 */
export interface ActionGroupLambdaDefinition {
    //lambdaCode is a Buffer containing the code for the Lambda function
    lambdaCode: Buffer;
    //lambdaRuntime is the runtime of the Lambda function
    lambdaRuntime: Runtime;
    //lambdaHandler provides the entry point of the Lambda function
    lambdaHandler: string;
}

/**
 * Contains details about the Lambda function containing the business logic that is carried 
 * out upon invoking the action or the custom control method for handling the 
 * information elicited from the user.
 */

export interface ActionGroupExecutor {
    lambdaExecutor?: IFunction;
    lambdaDefinition?: ActionGroupLambdaDefinition;
    customControl?: string;
}

/**
 * Contains either details about the S3 object containing the OpenAPI schema for the 
 * action group or the JSON or YAML-formatted payload defining the schema
 */
export interface SchemaDefinition {
    // inlineAPISchema is an optional string containing the inline API schema
    inlineAPISchema?: string;
    // If schema is provided as a file, the constructor will make a deployment to S3
    // and construct the URI params to link to the action.
    apiSchemaFile?: Buffer;
    // Defines functions that each define parameters that the agent needs to invoke from the user.
    functionSchema?: bedrock.CfnAgent.FunctionSchemaProperty
}
/**
 * Interface defines the properties of an action group.
 */
export interface AgentActionGroupProps {
    // The name of the action group.
    actionGroupName: string;
    // Defines what actions are carried out by the agent, either lambda or custom control.
    actionGroupExecutor: ActionGroupExecutor;
    // Defines the access patterns of the functions
    schemaDefinition: SchemaDefinition;
    // The description of the action group.
    description?: string;
    // Defines the action group state. Default is ENABLED.
    actionGroupState?: 'ENABLED' | 'DISABLED';
}

/**
 * This is a lightweight class for holding the parameters required for creating
 * action groups. This doesn't have many utilities, associations and permissions
 * will be handled by the BlueprintConstruct
 */
export class AgentActionGroup extends Construct {
    public readonly actionGroupName: string;
    public readonly description: string | undefined;
    public readonly schemaDefinition: SchemaDefinition;
    public readonly customControl: string;
    public readonly actionGroupState: string;
    actionExecutor: bedrock.CfnAgent.ActionGroupExecutorProperty;
    public lambdaFunc: IFunction;
    constructor(scope: Construct, id: string, props: AgentActionGroupProps) {
        super(scope, id);

        this.actionGroupName = props.actionGroupName;
        this.description = props.description;
        this.setActionExecutor(props.actionGroupExecutor);

        if (!props.schemaDefinition.inlineAPISchema
            && !props.schemaDefinition.apiSchemaFile
            && !props.schemaDefinition.functionSchema) {
            throw new Error('OpenAPI schema or functionDefinition schema required for creating action group');
        }

        this.schemaDefinition = props.schemaDefinition;
        this.actionGroupState = props.actionGroupState ?? 'ENABLED';
    }

    /**
     * Creates a new AWS Lambda function with the provided code file and attaches
     * required permissions.
     *
     * @param lambdaCode - A Buffer(file) containing the code for the Lambda function.
     * @param lambdaRuntime - The runtime environment for the Lambda function (e.g., Node.js, Python, etc.).
     * @param handler - The entry point for the Lambda function (e.g., 'index.handler').
     * @returns The created Lambda function instance.
     */
    createLambdaFunction(lambdaCode: Buffer, lambdaRuntime: Runtime, handler: string): IFunction {

        const executionRole = this.createLambdaFunctionExecutionRole();
        const lambdaFuncProps: FunctionProps = {
            runtime: lambdaRuntime,
            handler: handler,
            code: Code.fromInline(lambdaCode.toString()),
            role: executionRole
        };

        return new Function(this, 'MyLambdaFunction', lambdaFuncProps);
    }

    createLambdaFunctionExecutionRole() {
        const lambdaRole = new Role(this, 'LambdaRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            description: 'Execution Role for Lambda function',
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
            ],
        });

        return lambdaRole;
    }

    public setActionExecutor(actionGroupExecutor: ActionGroupExecutor) {
        if (actionGroupExecutor.lambdaExecutor) {
            this.lambdaFunc = actionGroupExecutor.lambdaExecutor;
            this.actionExecutor = {
                lambda: this.lambdaFunc.functionArn
            };
        } else if (actionGroupExecutor.lambdaDefinition) {
            const { lambdaCode, lambdaRuntime, lambdaHandler } = actionGroupExecutor.lambdaDefinition;
            this.lambdaFunc = this.createLambdaFunction(lambdaCode, lambdaRuntime, lambdaHandler);
            this.actionExecutor = {
                lambda: this.lambdaFunc.functionArn
            };
        } else if (actionGroupExecutor.customControl) {
            this.actionExecutor = {
                customControl: actionGroupExecutor.customControl
            };
        } else {
            throw new Error('Action Group Executor is required. Please provide a lambda function or custom control');
        }
    }

    public getActionExecutor(): bedrock.CfnAgent.ActionGroupExecutorProperty {
        return this.actionExecutor;
    }
}