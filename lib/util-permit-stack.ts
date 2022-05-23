import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as appsync from '@aws-cdk/aws-appsync';

export class UtilPermitStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const auth_iamrolearn = cdk.Fn.importValue(this.node.tryGetContext('cognito_idpool_auth_iamrolearn_exportname'))
    const auth_iamrole = iam.Role.fromRoleArn(this, 'auth_iamrole', auth_iamrolearn)
    const graphqlapiid = cdk.Fn.importValue(this.node.tryGetContext('appsyncapiid_exportname'))
    const api = appsync.GraphqlApi.fromGraphqlApiAttributes(this, 'api', { graphqlApiId: graphqlapiid })
    
    const blogarticle_bucketname = cdk.Fn.importValue(this.node.tryGetContext('blogarticle_s3bucketname_exportname'))
    const blogarticle_bucket = s3.Bucket.fromBucketName(this, 'Bucket', blogarticle_bucketname)
    
    auth_iamrole.attachInlinePolicy(new iam.Policy(this, 'policy', {
      policyName: id + 'Auth',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "appsync:GraphQL"
          ],
          resources: [ api.arn + "/*" ]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "s3:PutObject",
            "s3:GetObject",
            "s3:ListBucket",
            "s3:DeleteObject"
          ],
          resources: [
            blogarticle_bucket.bucketArn,
            blogarticle_bucket.bucketArn + "/*"
          ]
        })
      ]
    }))
    
  }
}
