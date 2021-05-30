from requests_aws4auth import AWS4Auth
import boto3
from elasticsearch import Elasticsearch, RequestsHttpConnection
import uuid
from datetime import datetime, timezone, timedelta
import time
import random
import os
from faker import Faker
import json
import random

fake = Faker(["ja-JP"])

region = "ap-northeast-1" 
service = "es"
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

ENDPOINT = os.environ.get("ES_ENDPOINT")
INDEX = "content-index"
TYPE = "doc"

region = "ap-northeast-1"
service = "es"
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key,
                   credentials.secret_key,
                   region,
                   service,
                   session_token=credentials.token)

HOST = ENDPOINT.replace("https://", "")

es = Elasticsearch(
    hosts=[{"host": HOST, "port": 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

for i in range(1, 100):
    
    document = {
        "title": fake.name(),
        "content": fake.address(),
        "lank": random.randint(1, 100)
    }
    
    res = es.index(
        index=INDEX, 
        id=str(uuid.uuid1()), 
        body=json.dumps(document), 
        doc_type=TYPE
    )
    print(res)

