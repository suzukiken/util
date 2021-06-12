import * as cdk from '@aws-cdk/core';
import * as lambda from "@aws-cdk/aws-lambda";
import { PythonFunction } from '@aws-cdk/aws-lambda-python';
import * as events from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import * as appsync from '@aws-cdk/aws-appsync';
import * as iam from '@aws-cdk/aws-iam';

export class UtilApiCallStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const API_URL = cdk.Fn.importValue(this.node.tryGetContext('appsyncapiurl_exportname'))
    const GRAPHQL_APIID = cdk.Fn.importValue(this.node.tryGetContext('appsyncapiid_exportname'))
    const api = appsync.GraphqlApi.fromGraphqlApiAttributes(this, 'api', { graphqlApiId: GRAPHQL_APIID })
    
    var role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
      ]
    })
    
    role.attachInlinePolicy(new iam.Policy(this, 'Policy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "appsync:GraphQL"
          ],
          resources: [ api.arn + "/*" ]
        })
      ]
    }))
    
    const lambda_function = new PythonFunction(this, "LambdaFunction", {
      entry: "lambda/periodic-api-call",
      index: "main.py",
      handler: "lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      role: role,
      environment: {
        API_URL: API_URL
      }
    })
    
    const target = new LambdaFunction(lambda_function)

    const rule = new events.Rule(this, 'rule', {
     schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
     targets: [target],
    })
  }
}



