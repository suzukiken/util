# CDK Project to create DynamoDB and GraphQL Api, as well as Web Ui deployment flow. 

## Resources to be created

* A DynamoDB Table
* GraphQL Api
* CodePipeline

[diagram](https://diagram.figmentresearch.com/util)

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
* `cdk deploy UtilCrossstackinfoUpdaterStack`
* `npm run diagram`
* `npm run save-context`

## Parameters

These parameters are defined in cdk.json 

* basename


