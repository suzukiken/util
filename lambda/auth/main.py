import urllib.request
import json
import os
from jose import jwk, jwt
from jose.utils import base64url_decode

USERPOOL_ID = os.environ.get('USERPOOL_ID')
REGION = 'ap-northeast-1'

# https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_3MeHb2ISf/.well-known/jwks.json
KEYS_URL = 'https://cognito-idp.{}.amazonaws.com/{}/.well-known/jwks.json'.format(
    REGION, 
    USERPOOL_ID
)
# instead of re-downloading the public keys every time
# we download them only on cold start
# https://aws.amazon.com/blogs/compute/container-reuse-in-lambda/
with urllib.request.urlopen(KEYS_URL) as f:
    response = f.read()

KEYS = json.loads(response.decode('utf-8'))['keys']

def lambda_handler(event, context):
    print(event)
    
    token = event['request']['headers']['v-cognito-user-jwt']
    
    headers = jwt.get_unverified_headers(token)
    kid = headers['kid']

    key_index = -1
    for i in range(len(KEYS)):
        if kid == KEYS[i]['kid']:
            key_index = i
            break
    
    if key_index == -1:
        print('Public key not found in jwks.json')
        return 'jwks failed validation - return Public key'

    public_key = jwk.construct(KEYS[key_index])
    message, encoded_signature = str(token).rsplit('.', 1)
    
    decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))
    
    if not public_key.verify(message.encode('utf8'), decoded_signature):
        print('Signature verification failed')
        return 'jwks failed validation - return Signature'
    
    claims = jwt.get_unverified_claims(token)
    print(claims)
    print(claims['email'])
    claims['cognito_username'] = claims['cognito:username']
    claims['cognito_groups'] = claims['cognito:groups']
    
    return claims
    
