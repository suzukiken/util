#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { UtilDbStack } from '../lib/util-db-stack';
import { UtilApiStack } from '../lib/util-api-stack';
import { UtilPermitStack } from '../lib/util-permit-stack';
import { UtilUiDistroStack } from '../lib/util-ui-distro-stack';
import { UtilUiDeployStack } from '../lib/util-ui-deploy-stack';
import { UtilCrossstackinfoUpdaterStack } from '../lib/util-crossstackinfo-updater-stack';

const app = new cdk.App();
const utilDbStack = new UtilDbStack(app, 'UtilDbStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
const utilApiStack = new UtilApiStack(app, 'UtilApiStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
const utilPermitStack = new UtilPermitStack(app, 'UtilPermitStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
const utilUiDistroStack = new UtilUiDistroStack(app, 'UtilUiDistroStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
const utilUiDeployStack = new UtilUiDeployStack(app, 'UtilUiDeployStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
const utilCrossstackinfoUpdaterStack = new UtilCrossstackinfoUpdaterStack(app, 'UtilCrossstackinfoUpdaterStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});

utilUiDeployStack.addDependency(utilUiDistroStack)
utilUiDeployStack.addDependency(utilApiStack)
utilPermitStack.addDependency(utilApiStack)
utilApiStack.addDependency(utilDbStack)
utilCrossstackinfoUpdaterStack.addDependency(utilDbStack)