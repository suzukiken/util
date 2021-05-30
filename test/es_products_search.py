import requests
from requests_aws4auth import AWS4Auth
import os
from elasticsearch import Elasticsearch, RequestsHttpConnection
import boto3
import json

region = "ap-northeast-1" 
service = "es"
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

ENDPOINT = os.environ.get("ES_ENDPOINT")
INDEX = "product-index"
TYPE = "doc"

HOST = ENDPOINT.replace("https://", "")

es = Elasticsearch(
    hosts=[{"host": HOST, "port": 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

body = {
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

body = {
    "from": 0,
    "size": 1000,
    "query": {
        "query_string": {
            "query": "鈴木",
            "default_field": "title"
        }
    }
}

body = {
    "from": 0,
    "size": 1000,
    "query": {
        "match_phrase": {
            "title": "鈴木"
        }
    }
}

body = {
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

res = es.search(
    index=INDEX,
    doc_type=TYPE,
    body=body
)

print(res)
for hit in res["hits"]["hits"]:
    print("{} {}".format(hit["_source"], hit["_id"]))
