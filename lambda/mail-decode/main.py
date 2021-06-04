import boto3
import os
import email
import base64

BUCKET_NAME = os.environ.get('BUCKET_NAME')

s3 = boto3.resource('s3')
bucket = s3.Bucket(BUCKET_NAME)

def lambda_handler(event, context):
    print(event)
    
    obj = bucket.Object('mail/{}'.format(event['arguments']['id']))
    #print(obj)
    
    content = obj.get()['Body'].read().decode('utf-8')
    #print(content)
    
    msg = email.message_from_string(content)
    
    message = []
    
    def printPayload(payload):
        charset = payload.get_content_charset()
        try:
            dec = base64.b64decode(payload.get_payload()).decode(charset)
        except:
            dec = payload.get_payload()
        return dec
    
    if msg.is_multipart():
        for payload in msg.get_payload():
            content_type = payload.get_content_type()
            if content_type in ('text/plain', 'text/html'):
                message.append(printPayload(payload))
            elif content_type == 'multipart/alternative':
                for subpayload in payload.get_payload():
                    sub_content_type = subpayload.get_content_type()
                    if sub_content_type in ('text/plain', 'text/html'):
                        message.append(printPayload(subpayload))
    else:
        message.append(printPayload(msg.get_payload()))
        
    return '---delimiter---'.join(message)