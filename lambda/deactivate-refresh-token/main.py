import boto3
import os
import json

client = boto3.client('cognito-idp')

USERPOOL_ID = os.environ.get('USERPOOL_ID')

def lambda_handler(event, context):
    print(event)
    
    email = event['arguments']['email']
    print(email)
    
    filterstr = 'email = \"{}\"'.format(email)

    response = client.list_users(
        UserPoolId=USERPOOL_ID,
        Filter=filterstr
    )
    
    print(response)
    
    username = response['Users'][0]['Username']
    
    print(username)
    
    response = client.admin_user_global_sign_out(
        UserPoolId=USERPOOL_ID,
        Username=username
    )
    
    print(response)
    
    return 'done'
    
'''
{
  "Users":[
    {
      "Username":"Google_111618195145616130842",
      "Attributes":[
        {
          "Name":"sub",
          "Value":"aa20990d-0d16-4200-8bd7-64f57941aa1c"
        },
        {
          "Name":"identities",
          "Value":"[{\"userId\":\"111618195145616130842\",\"providerName\":\"Google\",\"providerType\":\"Google\",\"issuer\":null,\"primary\":true,\"dateCreated\":1622940509457}]"
        },
'''