import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as appsync from '@aws-cdk/aws-appsync';

export class UtilPermitStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const auth_iamrolearn = cdk.Fn.importValue(this.node.tryGetContext('cognito_idpool_auth_iamrolearn_exportname'))
    const auth_iamrole = iam.Role.fromRoleArn(this, 'auth_iamrole', auth_iamrolearn)
    const graphqlapiid = cdk.Fn.importValue(this.node.tryGetContext('appsyncapiid_exportname'))
    const api = appsync.GraphqlApi.fromGraphqlApiAttributes(this, 'api', { graphqlApiId: graphqlapiid })
    
    auth_iamrole.attachInlinePolicy(new iam.Policy(this, 'policy', {
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
    
  }
}
