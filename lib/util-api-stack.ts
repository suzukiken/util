import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as appsync from "@aws-cdk/aws-appsync";
import * as lambda from '@aws-cdk/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python';

export class UtilApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const basename = this.node.tryGetContext('basename')
    const tablename = cdk.Fn.importValue(this.node.tryGetContext('tablename_exportname'))
    const cognito_userpool_id = cdk.Fn.importValue(this.node.tryGetContext('cognito_userpool_id_exportname'))
    
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
      "Dynamo",
      table
    )

    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "get",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem("id", "id"),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    })
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "getStrings",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `{"version": "2017-02-28", "operation": "GetItem", "key": {"id": $util.dynamodb.toDynamoDBJson("1")}}`
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `
          $util.toJson($ctx.result.value)
        `
      ),
    })
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "getDiction",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `{"version": "2017-02-28", "operation": "GetItem", "key": {"id": $util.dynamodb.toDynamoDBJson("2")}}`
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `
          $util.toJson($ctx.result.value)
        `
      ),
    })
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "listCrossStackReferences",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `{"version": "2017-02-28", "operation": "GetItem", "key": {"id": $util.dynamodb.toDynamoDBJson("3")}}`
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `
          $util.toJson($ctx.result.value)
        `
      ),
    })
    
    const auth_function = new PythonFunction(this, "Auth", {
      entry: "lambda/auth",
      index: "main.py",
      handler: "lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      environment: {
        USERPOOL_ID: cognito_userpool_id
      }
    })
    
    const lambda_datasource = api.addLambdaDataSource('Lambda', auth_function)
    
    lambda_datasource.createResolver({
      typeName: "Mutation",
      fieldName: "put",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
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
