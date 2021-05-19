import boto3
import botocore
import os
from pprint import pprint

TABLENAME = os.environ.get('TABLENAME')

cloudformation = boto3.client('cloudformation')

config = botocore.config.Config(retries={'max_attempts': 10, 'mode': 'standard'})
resource = boto3.resource('dynamodb', config=config)
table = resource.Table(TABLENAME)

def lambda_handler(event, context):
    
    # get exported value list
    
    next_token = None
    exports = []
    
    while True:
        if next_token:
            res = cloudformation.list_exports(NextToken=next_token)
        else:
            res = cloudformation.list_exports()
        
        for export in res['Exports']:
            exports.append(export)
        
        next_token = res.get('NextToken')
        
        if not next_token:
            break

    # get imported stack list
    # iterating over exported list
    
    for export in exports:
    
        next_token = None
        importers = []
        
        while True:
            try:
                if next_token:
                    res = cloudformation.list_imports(
                        ExportName=export['Name'],
                        NextToken=next_token
                    )
                else:
                    res = cloudformation.list_imports(
                        ExportName=export['Name']
                    )
            except botocore.exceptions.ClientError as error:
                # no imports
                break
            else:
                for importer in res['Imports']:
                    importers.append(importer)
                
                next_token = res.get('NextToken')
            
                if not next_token:
                    break
        
        export['imports'] = importers
            
    thelist = []
    
    for export in exports:
        thelist.append({
            'stack': export['ExportingStackId'],
            'name': export['Name'], 
            'value': export['Value'],
            'imports': export['imports']
        })

    item = {
        'id': 'cloudformation-exported-list',
        'value': thelist
    }
    response = table.put_item(Item=item)
    
    print(response)