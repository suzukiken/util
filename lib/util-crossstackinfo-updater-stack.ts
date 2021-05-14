import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from '@aws-cdk/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python';
import * as events from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';

export class UtilCrossstackinfoUpdaterStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const tablename = cdk.Fn.importValue(this.node.tryGetContext('tablename_exportname'))
    
    const table = dynamodb.Table.fromTableName(this, "Table", tablename)
    
    const lambda_function = new PythonFunction(this, "Auth", {
      entry: "lambda/crossstack-revealing",
      index: "main.py",
      handler: "lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      environment: {
        TABLENAME: table.tableName
      },
      timeout: cdk.Duration.minutes(15)
    })
    
    table.grantWriteData(lambda_function)
    
    const target = new LambdaFunction(lambda_function)

    const rule = new events.Rule(this, 'rule', {
     schedule: events.Schedule.rate(cdk.Duration.hours(1)),
     targets: [target],
    })
    
  }
}
