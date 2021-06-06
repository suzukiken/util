import boto3
import os
import re
import json
from pprint import pprint

'''
BUCKET_NAME: ssm::/auth1/cognito/idpool/id
BUCKET_NAME2: ssm:us-east-1:lambdaatedge-domain-name
TABLE_NAME: cfn::fgmtbe-ses-receive-functionarn
TABLE_NAME2:cloudformation:us-east-1:table-name
PASSWORD: sm::slack-app-telldone
PASSWORD2:sm::slack-app-telldone
PASSWORD2=secretsmanager:us-east-1:slack-app-telldone
PASSWORD2=sm::slack-app-telldone:SLACK_TOKEN
'''

services = {
    'ssm': {
        'regexps': ['(^|[^a-z])(ssm:[a-zA-Z0-9-]*:[a-zA-Z0-9-_/]+)'],
        'description': 'Systems Manager Parameter Store'
    },
    'cloudformation': {
        'regexps': [
            '(^|[^a-z])(cfn:[a-zA-Z0-9-]*:[a-zA-Z0-9-_]+)', 
            '(^|[^a-z])(cloudformation:[a-zA-Z0-9-]*:[a-zA-Z0-9-_]+)'
        ],
        'description': 'CloudFormation Outputs Export'
    },
    'secretsmanager': {
        'regexps': [
            '(^|[^a-z])(sm:[a-zA-Z0-9-]*:[a-zA-Z0-9-_/]+:[a-zA-Z0-9-_]+)', 
            '(^|[^a-z])(secretsmanager:[a-zA-Z0-9-]*:[a-zA-Z0-9-_/]+:[a-zA-Z0-9-_/]+)'
        ],
        'description': 'Secrets Manager Secrets'
    },
}

def lambda_handler(event, context):
    print(event)
    
    content = event['arguments']['content']
    
    founds = {}
    
    for key in services:
        for regexp in services[key]['regexps']:
            matchparts = re.findall(regexp, content)
            if matchparts:
                if not key in founds:
                    founds[key] = []
            for matchpart in matchparts:
                founds[key].append(matchpart[1])
    
    print(founds)
    
    replaces = []
    
    for key in founds:
        if key == 'ssm':
            for part in set(founds[key]):
                _, region, name = part.split(':')
                if region == '':
                    region = 'ap-northeast-1'
                ssm = boto3.client(key, region_name=region)
                response = ssm.get_parameters(
                    Names=[name]
                )
                if len(response['Parameters']) == 1:
                    replaces.append({
                        'original': part,
                        'replacement': response['Parameters'][0]['Value']
                    })
        elif key == 'cloudformation':
            next_token = None
            exports = {}
            for part in set(founds[key]):
                _, region, name = part.split(':')
                if region == '':
                    region = 'ap-northeast-1'
                if not region in exports:
                    exports[region] = {}
                    cloudformation = boto3.client(key, region_name=region)
                    while True:
                        if next_token:
                            res = cloudformation.list_exports(NextToken=next_token)
                        else:
                            res = cloudformation.list_exports()
                        for export in res['Exports']:
                            exports[region][export['Name']] = export['Value']
                        next_token = res.get('NextToken')
                        if not next_token:
                            break
                if name in exports[region]:
                    replaces.append({
                        'original': part,
                        'replacement': exports[region][name]
                    })
        elif key == 'secretsmanager':
            for part in set(founds[key]):
                unpacked = part.split(':')
                if len(unpacked) == 4:
                    _, region, name, param = unpacked
                else:
                    continue
                if region == '':
                    region = 'ap-northeast-1'
                secretsmanager = boto3.client(key, region_name=region)
                try:
                    response = secretsmanager.get_secret_value(
                        SecretId=name
                    )
                except secretsmanager.exceptions.ResourceNotFoundException:
                    continue
                if 'SecretString' in response:
                    secret_string = json.loads(response['SecretString'])
                    if param in secret_string:
                        replaces.append({
                            'original': part,
                            'replacement': secret_string[param]
                        })
    
    print(replaces)
    
    for replace in replaces:
        content = content.replace(replace['original'], replace['replacement'])
    
    return content
    
