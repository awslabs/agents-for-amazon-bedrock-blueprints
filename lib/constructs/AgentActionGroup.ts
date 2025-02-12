import { Construct } from "constructs";
import { aws_bedrock as bedrock, Duration } from "aws-cdk-lib";
import { Code, Function, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { IManagedPolicy, ManagedPolicy, PolicyDocument, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";

/**
 * Interface defines the properties of code to build the lambda function.
 * The constructs will be responsible for permission management.
 */
export interface ActionGroupLambdaDefinition {
  /**
   * The code for the Lambda function.
   *
   * For Node.js and TypeScript functions, you can provide the code as a `Buffer` object.
   * For other runtimes (e.g., Python, Java, etc.), provide the code as a `Code` object.
   */
  lambdaCode: Buffer | Code;
  //lambdaRuntime is the runtime of the Lambda function
  lambdaRuntime: Runtime;
  //lambdaHandler provides the entry point of the Lambda function
  lambdaHandler: string;
  // timeoutInMinutes - timeout duration for the Lambda function (optional)
  timeoutInMinutes?: number;
  // environment -  environment variables of the Lambda function (optional)
  environment?: { [key: string]: string };
  // managedPolicies - managed policies to be attached to the Lambda function's execution role (optional)
  managedPolicies?: IManagedPolicy[];
  // inlinePolicies - inline policies(type: {policyName: string, policy: PolicyDocument} ) to be attached to the Lambda function's execution role (optional)
  inlinePolicies?: { [key: string]: PolicyDocument };
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
  functionSchema?: bedrock.CfnAgent.FunctionSchemaProperty;
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
  actionGroupState?: "ENABLED" | "DISABLED";
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

    if (
      !props.schemaDefinition.inlineAPISchema &&
      !props.schemaDefinition.apiSchemaFile &&
      !props.schemaDefinition.functionSchema
    ) {
      throw new Error("OpenAPI schema or functionDefinition schema required for creating action group");
    }

    this.schemaDefinition = props.schemaDefinition;
    this.actionGroupState = props.actionGroupState ?? "ENABLED";
  }

  /**
   * Creates a new AWS Lambda function with the provided code file that contains the business logic for an action group and attaches
   * required permissions. This Lambda function serves as the backend processing unit for the Action Group.
   * It receives the information that the Bedrock agent elicits from the user during the conversation and performs the necessary actions
   * based on the provided business logic.
   *
   * @param lambdaCode - A Buffer containing the code for the Lambda function.
   * @param lambdaRuntime - The runtime environment for the Lambda function (e.g., Node.js, Python, etc.).
   * @param handler - The entry point for the Lambda function (e.g., 'index.handler').
   * @param timeoutInMinutes - The timeout duration for the Lambda function.
   * @param environment - The environment variables to be passed to the Lambda function.
   * @param managedPolicies - The managed policies to be attached to the Lambda function's execution role.
   * @param inlinePolicies - The inline policies to be attached to the Lambda function's execution role.
   * @returns The created Lambda function instance.
   */
  private createLambdaFunction(
    lambdaCode: Buffer | Code,
    runtime: Runtime,
    handler: string,
    timeoutInMinutes: number | undefined,
    environment: { [key: string]: string } | undefined,
    managedPolicies: IManagedPolicy[] = [],
    inlinePolicies: { [key: string]: PolicyDocument } = {}
  ): IFunction {
    if (!lambdaCode) {
      throw new Error("lambdaCode is undefined.");
    }

    let lambdaFunction: IFunction;
    const executionRole = this.createLambdaFunctionExecutionRole(managedPolicies, inlinePolicies);
    const timeout = Duration.minutes(typeof timeoutInMinutes === "number" ? timeoutInMinutes : 15);

    if (lambdaCode instanceof Buffer) {
      const tempDir = this.createTempDirectory(lambdaCode);
      lambdaFunction = new NodejsFunction(this, `${this.actionGroupName}LambdaFunction`, {
        runtime,
        handler,
        entry: join(tempDir, "index.ts"),
        role: executionRole,
        timeout,
        environment,
      });

      // Delete the temporary directory if created after creating the Lambda function.
      rmSync(tempDir, { recursive: true });
    } else {
      lambdaFunction = new Function(this, `${this.actionGroupName}LambdaFunction`, {
        runtime,
        handler,
        code: lambdaCode,
        role: executionRole,
        timeout,
        environment,
      });
    }

    return lambdaFunction;
  }

  private createTempDirectory(lambdaCode: Buffer): string {
    const tempDir = mkdtempSync(join(tmpdir(), "lambda-code-"));
    const tempFilePath = join(tempDir, "index.ts");
    writeFileSync(tempFilePath, lambdaCode);
    return tempDir;
  }

  /**
   * Creates a new IAM role with the necessary permissions for the Lambda function execution.
   * This role is used to grant the Lambda function permissions to interact with other AWS services.
   * The role includes the AWS managed policy 'AWSLambdaBasicExecutionRole' by default.
   * Additional managed policies and inline policies can be attached to the role as needed based on the action group requirements.
   *
   * @param managedPolicies - The managed policies to be attached to the Lambda function's execution role.
   * @param inlinePolicies - The inline policies to be attached to the Lambda function's execution role.
   * @returns The created IAM role instance.
   */

  private createLambdaFunctionExecutionRole(
    managedPolicies: IManagedPolicy[] = [],
    inlinePolicies: { [key: string]: PolicyDocument } = {}
  ) {
    const lambdaRole = new Role(this, "LambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      description: "Execution Role for Lambda function",
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
        ...managedPolicies, // Include managed policies defined as part of the action group
      ],
      inlinePolicies: {
        ...inlinePolicies, // Include inline policies defined as part of the action group
      },
    });

    return lambdaRole;
  }

  /**
   * Sets the action executor for the action group based on the provided action group executor.
   *
   * @param actionGroupExecutor - The action group executor containing the lambda function or custom control.
   */
  public setActionExecutor(actionGroupExecutor: ActionGroupExecutor) {
    if (actionGroupExecutor.lambdaExecutor) {
      this.lambdaFunc = actionGroupExecutor.lambdaExecutor;
      this.actionExecutor = {
        lambda: this.lambdaFunc.functionArn,
      };
    } else if (actionGroupExecutor.lambdaDefinition) {
      const {
        lambdaCode,
        lambdaRuntime,
        lambdaHandler,
        timeoutInMinutes,
        environment,
        managedPolicies,
        inlinePolicies,
      } = actionGroupExecutor.lambdaDefinition;
      this.lambdaFunc = this.createLambdaFunction(
        lambdaCode,
        lambdaRuntime,
        lambdaHandler,
        timeoutInMinutes,
        environment,
        managedPolicies,
        inlinePolicies
      );
      this.actionExecutor = {
        lambda: this.lambdaFunc.functionArn,
      };
    } else if (actionGroupExecutor.customControl) {
      this.actionExecutor = {
        customControl: actionGroupExecutor.customControl,
      };
    } else {
      throw new Error("Action Group Executor is required. Please provide a lambda function or custom control");
    }
  }

  public getActionExecutor(): bedrock.CfnAgent.ActionGroupExecutorProperty {
    return this.actionExecutor;
  }
}
