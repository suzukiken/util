import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as ssm from "@aws-cdk/aws-ssm";

export class UtilDbStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const basename = this.node.tryGetContext('basename')

    const table = new dynamodb.Table(this, "Table", {
      tableName: basename + "-table",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true
    })
    
    new cdk.CfnOutput(this, 'dbnameout', { 
      exportName: this.node.tryGetContext('tablename_exportname'), 
      value: table.tableName,
    })
    
    new ssm.StringParameter(this, 'dbnameparam', { 
      parameterName: this.node.tryGetContext('tablename_ssm_paramname'), 
      stringValue: table.tableName,
    })
  }
}
