import boto3
import os

BUCKET_NAME = os.environ.get('BUCKET_NAME')

client = boto3.client('s3')

def lambda_handler(event, context):
    print(event)
    
    prefix = 'mail/'
    
    response = client.list_objects_v2(
        Bucket=BUCKET_NAME,
        MaxKeys=100,
        Prefix=prefix
    )
    
    print(response)
    
    ret = []
    
    for content in response['Contents']:
        ret.append({
            'key': content['Key'].replace(prefix, ''),
            'modified': content['LastModified'].isoformat(),
            'size': content['Size']
        })
        
    return ret
    