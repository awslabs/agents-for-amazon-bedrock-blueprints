
import { CfnOutput, CfnResource, Duration, RemovalPolicy, Stack, StackProps, aws_rds as rds } from "aws-cdk-lib";
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { join } from "path";



export class HRAssistDataStack extends Construct {
    public readonly dbSecret: rds.DatabaseSecret;
    public readonly dbCluster: rds.ServerlessCluster;
    public readonly AuroraClusterArn: string;
    public readonly AuroraDatabaseSecretArn: string;

    constructor(scope: Construct, id: string) {
        super(scope, id);


        this.dbSecret = new rds.DatabaseSecret(this, 'AuroraSecret', {
            username: 'clusteradmin',
        });

        // Define Aurora Serverless cluster
        this.dbCluster = new rds.ServerlessCluster(this, 'AuroraCluster', {
            engine: rds.DatabaseClusterEngine.auroraPostgres({
                version: rds.AuroraPostgresEngineVersion.VER_13_12,
            }),
            clusterIdentifier: 'hr-agent-aurora-cluster',
            defaultDatabaseName: 'employeedatabase',
            credentials: rds.Credentials.fromSecret(this.dbSecret),
            enableDataApi: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });


        // Create a new Lambda function to populate sample data in the Aurora Serverless database
        const executionRole = this.createLambdaFunctionExecutionRole();
        const populateSampleDataFunction = new NodejsFunction(this, 'PopulateSampleDataFunc', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'handler',
            // entry: join(__dirname, '..', '..', 'lib', 'assets', 'functions', 'populate-data-in-rds.ts'),
            entry: join(__dirname, '..', '..', 'lambda', '01-agent-with-function-definitions', 'cr-populate-data-in-rds.ts'),
            role: executionRole,
            timeout: Duration.minutes(5), // Need a bit longer function execution time to populare the database
            environment: {    //  Pass the cluster ARN and secret ARN as env variables, so we can use them in the Lambda functions code. 
                CLUSTER_ARN: this.dbCluster.clusterArn,
                SECRET_ARN: this.dbCluster.secret?.secretArn || '',
            }
        })

        // Policy statement to grant permission to invoke the Lambda function - populateSampleDataFunction
        const invokePermission = new PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [populateSampleDataFunction.functionArn],
        });


        // The custom resource is granted necessary permissions to invoke the Lambda function
        // Grants the necessary permissions for the custom resource to make SDK calls, specifically to invoke the Lambda function 
        const customResourcePolicy = AwsCustomResourcePolicy.fromStatements([invokePermission])
        AwsCustomResourcePolicy.fromSdkCalls({
            resources: [populateSampleDataFunction.functionArn],
        });

        // Create a custom resource to trigger the execution of populateSampleDataFunction Lambda function whenever the stack is updated
        const customResource = new AwsCustomResource(this, 'TriggerPopulateDataFunction', {
            onUpdate: {
                service: 'Lambda',
                action: 'InvokeCommand',
                parameters: {
                    FunctionName: populateSampleDataFunction.functionName,
                    Payload: JSON.stringify({ message: 'Populate data in RDS' }),
                },
                physicalResourceId: PhysicalResourceId.of(Date.now().toString()),
            },
            policy: customResourcePolicy,
        })


        // Generate outputs from the PopulateSampleDataStack
        // These values are imported in the BedrockAgentWithFunctionDefinitionStack for the Action Group's Lambda function to utilize
        // These outputs are associated with the Aurora Serverless database,
        // and these values will be used as environmental variables in the Lambda function that interacts with the database defined in the BedrockAgentWithFunctionDefinitionStack
        new CfnOutput(this, 'AuroraClusterArn', {
            value: this.dbCluster.clusterArn,
            exportName: 'AuroraClusterArn',
            description: 'The ARN of the Aurora Serverless cluster',
        });

        new CfnOutput(this, 'AuroraDatabaseSecretArn', {
            value: this.dbCluster.secret?.secretArn || '',
            exportName: 'AuroraDatabaseSecretArn',
            description: 'The ARN of the secret for the Aurora Serverless cluster',
        });


    }


    createLambdaFunctionExecutionRole() {
        const lambdaRole = new Role(this, 'LambdaRoleToPopulateData', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            description: 'Execution Role for Lambda function',
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSDataFullAccess')  //NOTE: Adding this role to have Lambda access RDS database
            ],
            inlinePolicies: {
                'AllowAccessSecretManager': new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['secretsmanager:GetSecretValue'],
                            resources: [this.dbSecret.secretArn]
                        })
                    ]
                })
            }
        });

        return lambdaRole;
    }
}



