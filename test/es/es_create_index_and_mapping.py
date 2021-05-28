from requests_aws4auth import AWS4Auth
import boto3
from elasticsearch import Elasticsearch, RequestsHttpConnection
import uuid
from datetime import datetime, timezone, timedelta
import time
import random
import os

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

body = {
    "settings":{
        "analysis":{
            "tokenizer" : {
                "kuromoji_search_tokenizer" : {
                    "type" : "kuromoji_tokenizer",
                    "mode": "search"
                },
                "kuromoji_normal_tokenizer" : {
                    "type" : "kuromoji_tokenizer",
                    "mode": "normal"
                }
            },
            "analyzer" : {
                "kuromoji_search_analyzer" : {
                    "type" : "custom",
                    "tokenizer" : "kuromoji_search_tokenizer"
                },
                "kuromoji_normal_analyzer" : {
                    "type" : "custom",
                    "tokenizer" : "kuromoji_normal_tokenizer"
                }
            }
        }
    },
    "mappings": {
        "doc": {
            "properties": {
                "content": {
                    "type": "string"
                },
                "content_search": {
                    "type": "string",
                    "analyzer": "kuromoji_search_analyzer"
                },
                "content_normal": {
                    "type": "string",
                    "analyzer": "kuromoji_normal_analyzer"
                },
                "title": {
                    "type": "string",
                    "analyzer": "kuromoji_normal_analyzer"
                },
                "lank": {
                    "type": "long"
                }
            }
        }
    }
}

res = es.indices.create(index=INDEX, body=body)

print(res)
