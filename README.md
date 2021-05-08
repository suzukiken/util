# CDK Project to create DynamoDB and GraphQL Api, as well as Web Ui deployment flow. 

## Resources to be created

* A DynamoDB Table
* GraphQL Api
* CodePipeline

[diagram of Api by cfn-dia](https://diagram.figmentresearch.com/util/api)
[diagram of Table by cfn-dia](https://diagram.figmentresearch.com/util/db)
[diagram of IAM Policy by cfn-dia](https://diagram.figmentresearch.com/util/permit)
[diagram of Web UI Distribution by cfn-dia](https://diagram.figmentresearch.com/util/ui-distro)
[diagram of CodePipeline by cfn-dia](https://diagram.figmentresearch.com/util/ui-deploy)

## Purpose

To store and serve miscellaneous data.
Mostly to be used for experimental.

### How to use the resources which this CDK project creates

Mostly put data through Dynamo DB Api using boto3.
Getting data through Graph QL Api using Amplify JavaScript.

## Commands

* `npm install`
* `cdk deploy UtilDbStack`
* `cdk deploy UtilApiStack`
* `cdk deploy UtilPermitStack`
* `cdk deploy UtilUiDistroStack`
* `cdk deploy UtilUiDeployStack`
* `npm run diagram-api`
* `npm run diagram-db`
* `npm run diagram-permit`
* `npm run diagram-ui-distro`
* `npm run diagram-ui-deploy`
* `npm run save-context`

## Parameters

These parameters are defined in cdk.json 

* basename


