#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { UtilDbStack } from '../lib/util-db-stack';
import { UtilApiStack } from '../lib/util-api-stack';
import { UtilPermitStack } from '../lib/util-permit-stack';
import { UtilUiDistroStack } from '../lib/util-ui-distro-stack';
import { UtilUiDeployStack } from '../lib/util-ui-deploy-stack';

const app = new cdk.App();
new UtilDbStack(app, 'UtilDbStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
new UtilApiStack(app, 'UtilApiStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
new UtilPermitStack(app, 'UtilPermitStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
new UtilUiDistroStack(app, 'UtilUiDistroStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
new UtilUiDeployStack(app, 'UtilUiDeployStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});