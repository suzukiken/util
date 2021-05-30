import boto3
import os

BUCKET_NAME = os.environ.get('BUCKET_NAME')

s3 = boto3.resource('s3')
bucket = s3.Bucket(BUCKET_NAME)

def lambda_handler(event, context):
    print(event)
    