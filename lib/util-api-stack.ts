import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as appsync from "@aws-cdk/aws-appsync";
import * as lambda from '@aws-cdk/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python';
import * as es from "@aws-cdk/aws-elasticsearch";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as cognito from "@aws-cdk/aws-cognito";

export class UtilApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const basename = this.node.tryGetContext('basename')
    const tablename = cdk.Fn.importValue(this.node.tryGetContext('tablename_exportname'))
    const cognito_userpool_id = cdk.Fn.importValue(this.node.tryGetContext('cognito_userpool_id_exportname'))
    const mail_s3bucketname = this.node.tryGetContext('mail_s3bucketname')
    
    const ELASTICSEARCH_INDEX = "product-index";
    const ELASTICSEARCH_BLOG_INDEX = "blog";
    const ELASTICSEARCH_DOC_TYPE = "doctype";

    const es_endpoint = this.node.tryGetContext('elasticsearch_endpoint')
    const es_domain_arn = this.node.tryGetContext('elasticsearch_domainarn')
    const es_domain = es.Domain.fromDomainEndpoint(this, "EsDomain", es_endpoint)
    
    const mail_bucket = s3.Bucket.fromBucketName(this, "MailBucket", mail_s3bucketname)
    
    const userpool = cognito.UserPool.fromUserPoolId(this, "UserPool", cognito_userpool_id)
    
    const schema = new appsync.Schema({
        filePath: "graphql/schema.graphql",
      })
    
    const api = new appsync.GraphqlApi(this, "api", {
      name: basename + "-api",
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
        /*
        additionalAuthorizationModes: [{
          authorizationType: appsync.AuthorizationType.API_KEY
        }]
        */
      },
      schema: schema
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
    
    const mail_list_function = new PythonFunction(this, "MailList", {
      entry: "lambda/mail-list",
      index: "main.py",
      handler: "lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      environment: {
        BUCKET_NAME: mail_bucket.bucketName
      }
    })
    
    const mail_decode_function = new PythonFunction(this, "MailDecode", {
      entry: "lambda/mail-decode",
      index: "main.py",
      handler: "lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      environment: {
        BUCKET_NAME: mail_bucket.bucketName
      }
    })
    
    mail_bucket.grantRead(mail_list_function)
    mail_bucket.grantRead(mail_decode_function)
    
    const mail_list_lambda_datasource = api.addLambdaDataSource('MailListLambda', mail_list_function)
    const mail_decode_lambda_datasource = api.addLambdaDataSource('MailDecodeLambda', mail_decode_function)
    
    mail_list_lambda_datasource.createResolver({
      typeName: "Query",
      fieldName: "listMails",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    })
    
    mail_decode_lambda_datasource.createResolver({
      typeName: "Query",
      fieldName: "getMail",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    })
    
    // Role for Lambda to get params from ssm and secret manager

    const ssm_policy = new iam.Policy(this, "SSMPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["ssm:GetParameters"]
        })
      ],
    })
    
    const sm_policy = new iam.Policy(this, "SMPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["secretsmanager:GetSecretValue"]
        })
      ],
    })
    
    const cfn_policy = new iam.Policy(this, "CfnPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["cloudformation:ListExports"]
        })
      ],
    })
    
    const getparams_role = new iam.Role(this, "GetParamsLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
      ]
    })
    
    getparams_role.attachInlinePolicy(ssm_policy)
    getparams_role.attachInlinePolicy(sm_policy)
    getparams_role.attachInlinePolicy(cfn_policy)

    const getparams_function = new PythonFunction(this, "GetParams", {
      entry: "lambda/get-params",
      index: "main.py",
      handler: "lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      role: getparams_role
    })
    
    const getparams_lambda_datasource = api.addLambdaDataSource('GetParamsLambda', getparams_function)
    
    getparams_lambda_datasource.createResolver({
      typeName: "Query",
      fieldName: "getParams",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    })
    
    const deactivate_policy = new iam.Policy(this, "DeactivatePolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [ userpool.userPoolArn ],
          actions: [
            "cognito-idp:AdminUserGlobalSignOut",
            "cognito-idp:ListUsers"
          ]
        })
      ],
    })
    
    const deactivate_role = new iam.Role(this, "DeactivateLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
      ]
    })
    
    deactivate_role.attachInlinePolicy(deactivate_policy)
    
    const deactivate_function = new PythonFunction(this, "DeactivateRefreshToken", {
      entry: "lambda/deactivate-refresh-token",
      index: "main.py",
      handler: "lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      role: deactivate_role,
      environment: {
        USERPOOL_ID: cognito_userpool_id
      }
    })
    
    const deactivates_lambda_datasource = api.addLambdaDataSource('DeactivateRefreshTokenLambda', deactivate_function)
    
    deactivates_lambda_datasource.createResolver({
      typeName: "Mutation",
      fieldName: "deactivateRefreshToken",
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
    
    const es_search_blog_resolver = new appsync.CfnResolver(this, "BlogResolver", {
      apiId: api.apiId,
      typeName: "Query",
      fieldName: "searchBlogs",
      dataSourceName: es_datasource.name,
      requestMappingTemplate: `{
        "version":"2017-02-28",
        "operation":"GET",
        "path":"/${ELASTICSEARCH_BLOG_INDEX}/_search",
        "params": {
          "body": {
            "query": {
              "multi_match" : {
                "query": "$\{context.args.input.word\}",
                "fuzziness": $\{context.args.input.fuzziness\},
                "operator": "and",
                "fields": [ "title^10", "category^10", "tags^10", "content" ] 
              }
            },
            "sort": {
              "lank": {
                "order": "desc"
              }
            },
            "highlight": {
              "fields": {
                "title": {},
                "tags": {},
                "category": {},
                "content": {}
              }
            }
          }
        }
      }`,
      responseMappingTemplate: `
        #set($items = [])
        #foreach($entry in $context.result.hits.hits)
          #set($item = $entry.get("_source"))
          $util.qr($item.put("id", $entry.get("_id")))
          $util.qr($item.put("highlight", $entry.get("highlight")))
          $util.qr($items.add($item))
        #end
        $util.toJson($items)
      `,
    })
    
    const es_update_blog_lank_resolver = new appsync.CfnResolver(this, "UpdateBlogLankResolver", {
      apiId: api.apiId,
      typeName: "Mutation",
      fieldName: "updateBlogLank",
      dataSourceName: es_datasource.name,
      requestMappingTemplate: `{
        "version":"2017-02-28",
        "operation":"POST",
        "path":"/${ELASTICSEARCH_BLOG_INDEX}/${ELASTICSEARCH_DOC_TYPE}/$\{context.args.input.id\}/_update",
        "params": {
          "body": {
            "doc":{
              "lank": $\{context.args.input.lank\}
            }
          }
        }
      }`,
      responseMappingTemplate: `
        #set($item = $context.result.get("_source"))
        $util.qr($item.put("id", $context.result.get("_id")))
        $util.toJson($item)
      `,
    })

    // これが無いとNotFoundのエラーが出る
    es_search_resolver.addDependsOn(es_datasource);
    es_search_phrase_resolver.addDependsOn(es_datasource);
    es_all_resolver.addDependsOn(es_datasource);
    es_search_blog_resolver.addDependsOn(es_datasource);
    es_update_blog_lank_resolver.addDependsOn(es_datasource);
    
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
