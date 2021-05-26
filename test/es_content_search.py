import requests
from requests_aws4auth import AWS4Auth
import os
from elasticsearch import Elasticsearch, RequestsHttpConnection
import boto3
import json

region = 'ap-northeast-1' 
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

ENDPOINT = os.environ.get('ES_ENDPOINT')
INDEX = 'content-index'
TYPE = 'doc'

HOST = ENDPOINT.replace('https://', '')

es = Elasticsearch(
    hosts=[{'host': HOST, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

body1 = {
    "from": 0,
    "size": 1000,
    "query": {
        "match": {
            "title": {
                "query": "鈴木"
            }
        }
    }
}

body2 = {
    "from": 0,
    "size": 1000,
    "query": {
        "query_string": {
            "query": "鈴木",
            "default_field": "title"
        }
    }
}

body3 = {
    "from": 0,
    "size": 1000,
    "query": {
        "match_phrase": {
            "title": "鈴木"
        }
    }
}

body4 = {
    "from": 0,
    "size": 1000,
    "query": {
        "match_phrase": {
            "title": {
                "query": "鈴木",
                "analyzer": "standard"
            }
        }
    }
}

body6 = {
    "from": 0,
    "size": 1000,
    "search_fields": {
        "title": {
            "weight": 1000
        },
        "content": {
            "weight": 10
        }
    },
    "query": "新潟"
}

res = es.search(
    index=INDEX,
    doc_type=TYPE,
    body=body6
)

print(res)
for hit in res['hits']['hits']:
    print('{} {}'.format(hit["_source"], hit["_id"]))
