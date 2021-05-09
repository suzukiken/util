import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as appsync from "@aws-cdk/aws-appsync";

export class UtilApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const basename = this.node.tryGetContext('basename')
    const tablename = cdk.Fn.importValue(this.node.tryGetContext('tablename_exportname'))
    
    const api = new appsync.GraphqlApi(this, "api", {
      name: basename + "-api",
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
      schema: new appsync.Schema({
        filePath: "graphql/schema.graphql",
      }),
    })
    
    const table = dynamodb.Table.fromTableName(this, "Table", tablename)
    
    const dynamo_datasource = api.addDynamoDbDataSource(
      "dynamo_datasource",
      table
    )

    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "get",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem("id", "id"),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    })
    
    new cdk.CfnOutput(this, 'AppsyncapiId', { 
      exportName: this.node.tryGetContext('appsyncapiid_exportname'), 
      value: api.apiId,
    })
    
    new cdk.CfnOutput(this, 'AppsyncapiUrl', { 
      exportName: this.node.tryGetContext('appsyncapiurl_exportname'), 
      value: api.graphqlUrl,
    })
  }
}
