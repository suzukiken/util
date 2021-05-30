import requests
from requests_aws4auth import AWS4Auth
import os
from elasticsearch import Elasticsearch, RequestsHttpConnection
import uuid
from faker import Faker
from faker_vehicle import VehicleProvider
import boto3
import json

fake = Faker(["ja-JP"])

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

for i in range(400, 800):
    
    product = {
        "id": i,
        "title": fake.name()
    }
    
    res = es.index(
        index=INDEX, 
        id=str(uuid.uuid1()), 
        body=json.dumps(product), 
        doc_type=TYPE
    )
    print(res)