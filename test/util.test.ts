import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Util from '../lib/util-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Util.UtilStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
