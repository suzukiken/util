import os, sys
import re
import boto3
from botocore.config import Config
from requests_aws4auth import AWS4Auth
from elasticsearch import Elasticsearch, RequestsHttpConnection
import uuid
from datetime import date, datetime, timezone, timedelta
import time
import random
import json

region = 'ap-northeast-1' 
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

ENDPOINT = os.environ.get('ES_ENDPOINT')
INDEX = 'test-index'
TYPE = 'doc'

region = 'ap-northeast-1'
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key,
                   credentials.secret_key,
                   region,
                   service,
                   session_token=credentials.token)

HOST = ENDPOINT.replace('https://', '')

es = Elasticsearch(
    hosts=[{'host': HOST, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

# get articles from blog

contents1 = "AWS Elasticsearch ServiceをCognito認証で使っている。Googleで検索すればElastic.coのサイトが引っかかるのでそちらのドキュメントを見ることが多い。"
contents2 = "AWSのCognitoはGoogleのOAuth2認証を利用してシングルサインオンでユーザーを認証することができるのでそのユーザーにAWS Elasticsearch Serviceへのアクセスを許可できる。"

documents = [
    {
        'content': contents1,
        'content_search': contents1,
        'content_normal': contents1,
        'title': 'Elasticsearch Serviceの特徴',
        'lank': 1
    },
    {
        'content': contents2,
        'content_search': contents2,
        'content_normal': contents2,
        'title': 'Cognitoを利用する',
        'lank': 2
    },
]

for document in documents:
    res = es.index(
        index=INDEX, 
        id=str(uuid.uuid1()), 
        body=json.dumps(document), 
        doc_type=TYPE
    )
    print(res)

