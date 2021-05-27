import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as appsync from "@aws-cdk/aws-appsync";
import * as lambda from '@aws-cdk/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python';
import * as es from "@aws-cdk/aws-elasticsearch";
import * as iam from "@aws-cdk/aws-iam";

export class UtilApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const basename = this.node.tryGetContext('basename')
    const tablename = cdk.Fn.importValue(this.node.tryGetContext('tablename_exportname'))
    const cognito_userpool_id = cdk.Fn.importValue(this.node.tryGetContext('cognito_userpool_id_exportname'))
    
    const ELASTICSEARCH_INDEX = "product-index";
    const ELASTICSEARCH_ARTICLE_INDEX = "article-index";

    const es_endpoint = this.node.tryGetContext('elasticsearch_endpoint')
    const es_domain_arn = this.node.tryGetContext('elasticsearch_domainarn')
    const es_domain = es.Domain.fromDomainEndpoint(this, "EsDomain", es_endpoint)
    
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
    const dynamo_datasource = api.addDynamoDbDataSource("Dynamo", table)
    
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
      typeName: "Query",
      fieldName: "listArticles",
       requestMappingTemplate: appsync.MappingTemplate.fromString(
        `
          {
            "version" : "2017-02-28",
            "operation" : "Scan",
            "limit" : $ctx.args.limit,
            "filter" : {
              "expression" : "begins_with(id, :id)",
              "expressionValues" : {
                  ":id" : $util.dynamodb.toDynamoDBJson("blog/")
              }
            }
          }
        `
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList()
    })
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "getArticle",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem("id", "id"),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    })
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "searchArticles",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `
          {
            "version" : "2017-02-28",
            "operation" : "Scan",
            "limit" : 100,
            "filter" : {
              "expression" : "contains(content, :word) or contains(title, :word)",
              "expressionValues" : {
                  ":word" : $util.dynamodb.toDynamoDBJson($ctx.args.word)
              }
            }
          }
        `
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
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
              $util.qr($fiction.put("id", "fiction-$util.autoId()"))
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
    
    const none_datasource = new appsync.NoneDataSource(this, 'None', {
      api: api
    })
    
    none_datasource.createResolver({
      typeName: "Mutation",
      fieldName: "putEvent",
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        `{
          "version": "2018-05-29",
          "payload": {
            "message": "$ctx.args.message"
          }
        }`
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `$util.toJson($ctx.result)`
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
    
    // ES

    // Role for appsync that query Elasticsearch

    const appsync_es_role = new iam.Role(this, "appsync_es_role", {
      assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
      roleName: "cdkappsync-es-role",
    });

    const appsync_es_policy_statement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
    });

    appsync_es_policy_statement.addActions("es:ESHttpPost");
    appsync_es_policy_statement.addActions("es:ESHttpDelete");
    appsync_es_policy_statement.addActions("es:ESHttpHead");
    appsync_es_policy_statement.addActions("es:ESHttpGet");
    appsync_es_policy_statement.addActions("es:ESHttpPut");

    appsync_es_policy_statement.addResources(
      es_domain_arn + "/*"
    );

    const appsync_es_policy = new iam.Policy(this, "appsync_es_policy", {
      policyName: "cdkappsync-es-policy",
      statements: [appsync_es_policy_statement],
    });

    appsync_es_role.attachInlinePolicy(appsync_es_policy);

    // Register Elasticsearch as data source and resolvers

    const es_datasource = new appsync.CfnDataSource(this, "es_datasource", {
      apiId: api.apiId,
      name: "elasticsearch",
      type: "AMAZON_ELASTICSEARCH",
      elasticsearchConfig: {
        awsRegion: "ap-northeast-1",
        endpoint: es_endpoint, // es_domain.domainEndpoint,
      },
      serviceRoleArn: appsync_es_role.roleArn,
    });

    const es_search_resolver = new appsync.CfnResolver(this, "EsResolver", {
      apiId: api.apiId,
      typeName: "Query",
      fieldName: "searchProduct",
      dataSourceName: es_datasource.name,
      requestMappingTemplate: `{
        "version":"2017-02-28",
        "operation":"GET",
        "path":"/${ELASTICSEARCH_INDEX}/_search",
        "params":{
          "body": {
            "from": 0,
            "size": 200,
            "query": {
              "match": {
                "title": "$\{context.args.title\}"
              }
            }
          }
        }
      }`,
      responseMappingTemplate: `[
        #foreach($entry in $context.result.hits.hits)
          ## $velocityCount starts at 1 and increments with the #foreach loop **
          #if( $velocityCount > 1 ) , #end
          $util.toJson($entry.get("_source"))
        #end
      ]`,
    });
    
    const es_search_phrase_resolver = new appsync.CfnResolver(this, "EsPhraseResolver", {
      apiId: api.apiId,
      typeName: "Query",
      fieldName: "searchProductPhrase",
      dataSourceName: es_datasource.name,
      requestMappingTemplate: `{
        "version":"2017-02-28",
        "operation":"GET",
        "path":"/${ELASTICSEARCH_INDEX}/_search",
        "params":{
          "body": {
            "from": 0,
            "size": 200,
            "query": {
              "match_phrase": {
                "title": "$\{context.args.title\}"
              }
            }
          }
        }
      }`,
      responseMappingTemplate: `[
        #foreach($entry in $context.result.hits.hits)
          ## $velocityCount starts at 1 and increments with the #foreach loop **
          #if( $velocityCount > 1 ) , #end
          $util.toJson($entry.get("_source"))
        #end
      ]`,
    })

    const es_all_resolver = new appsync.CfnResolver(this, "es_all_resolver", {
      apiId: api.apiId,
      typeName: "Query",
      fieldName: "listProducts",
      dataSourceName: es_datasource.name,
      requestMappingTemplate: `{
        "version":"2017-02-28",
        "operation":"GET",
        "path":"/${ELASTICSEARCH_INDEX}/_search",
        "params": {
          "body": {
            "query" : {
              "match_all" : {}
            }
          }
        }
      }`,
      responseMappingTemplate: `[
        #foreach($entry in $context.result.hits.hits)
          ## $velocityCount starts at 1 and increments with the #foreach loop **
          #if( $velocityCount > 1 ) , #end
          $util.toJson($entry.get("_source"))
        #end
      ]`,
    });
    
    const es_search_article_resolver = new appsync.CfnResolver(this, "ArticleEsResolver", {
      apiId: api.apiId,
      typeName: "Query",
      fieldName: "searchArticlesEs",
      dataSourceName: es_datasource.name,
      requestMappingTemplate: `{
        "version":"2017-02-28",
        "operation":"GET",
        "path":"/${ELASTICSEARCH_ARTICLE_INDEX}/_search",
        "params":{
          "body": {
            "from": 0,
            "size": 200,
            "query": {
              "match_phrase": {
                "content": "$\{context.args.word\}"
              }
            }
          }
        }
      }`,
      responseMappingTemplate: `[
        #foreach($entry in $context.result.hits.hits)
          ## $velocityCount starts at 1 and increments with the #foreach loop **
          #if( $velocityCount > 1 ) , #end
          $util.toJson($entry.get("_source"))
        #end
      ]`,
    })

    // これが無いとNotFoundのエラーが出る
    es_search_resolver.addDependsOn(es_datasource);
    es_search_phrase_resolver.addDependsOn(es_datasource);
    es_all_resolver.addDependsOn(es_datasource);
    
    // Output
    
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
