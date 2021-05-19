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
      fieldName: "listCrossStackReferences",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `{"version": "2017-02-28", "operation": "GetItem", "key": {"id": $util.dynamodb.toDynamoDBJson("cloudformation-exported-list")}}`
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `$util.toJson($ctx.result.value)`
      ),
    })
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "listFictions",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `
          {
            "version" : "2017-02-28",
            "operation" : "Scan",
            "limit" : 100,
            "filter" : {
              "expression" : "begins_with(id, :id)",
              "expressionValues" : {
                  ":id" : $util.dynamodb.toDynamoDBJson("fiction-")
              }
            }
          }
        `
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList()
    })
    
    dynamo_datasource.createResolver({
      typeName: "Mutation",
      fieldName: "updateFiction",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition('id').is('input.id'),
        appsync.Values.projecting('input')
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    })
    
    dynamo_datasource.createResolver({
      typeName: "Mutation",
      fieldName: "deleteFiction",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbDeleteItem('id', 'id'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    })
    
    dynamo_datasource.createResolver({
      typeName: "Mutation",
      fieldName: "batchDeleteFictions",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `
          #set($ids = [])
          #foreach($id in $ctx.args.ids)
            #set($map = {})
            $util.qr($map.put("id", $util.dynamodb.toString($id)))
            $util.qr($ids.add($map))
          #end
          {
            "version" : "2018-05-29",
            "operation" : "BatchDeleteItem",
            "tables" : {
              "util-table": $util.toJson($ids)
            }
          }
        `
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `$util.toJson($ctx.result.data.util-table)`
      ),
    })
    
    dynamo_datasource.createResolver({
      typeName: "Mutation",
      fieldName: "batchPutFictions",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `
          #set($items = [])
          #foreach($fiction in $ctx.args.fictions)
            #set($id = $fiction.get("id"))
            #if(!$id || $id == "")
              $util.qr($fiction.put("id", $util.autoId()))
            #end
            $util.qr($items.add($util.dynamodb.toMapValues($fiction)))
          #end
          {
            "version" : "2018-05-29",
            "operation" : "BatchPutItem",
            "tables" : {
              "util-table": $util.toJson($items)
            }
          }
        `
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `$util.toJson($ctx.result.data.util-table)`
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
      typeName: "Query",
      fieldName: "parseJwt",
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
