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

region = "ap-northeast-1" 
service = "es"
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

ENDPOINT = os.environ.get("ES_ENDPOINT")
INDEX = "article-index"
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

# get articles from blog

path = "/home/ec2-user/environment/blog/content/aws"
dirs = os.listdir( path )

tiexp = "title = "(.+?)""
tgexp = "tags = \[(.+?)\]"
dtexp = "date = "(.+?)""
coexp = "\n[+]{3}\n(.*)"

# put articles to algolia

config = Config(retries={"max_attempts": 10, "mode": "standard"})
resource = boto3.resource("dynamodb", config=config)
table = resource.Table(os.environ.get("TABLENAME"))

articles = []

for filename in dirs:
    fpt = os.path.join(path, filename)
    fop = open(fpt, "r")
    fco = fop.read()
    
    mat = re.search(tiexp, fco)
    if mat:
        title = mat.group(1)
        
    mat = re.search(tgexp, fco)
    if mat:
        found = mat.group(1)
        tags = [stg.replace(""", "").strip() for stg in found.split(",")]
        
    mat = re.search(dtexp, fco)
    if mat:
        found = mat.group(1)
        dte = date.fromisoformat(found)
    
    mat = re.search(coexp, fco, flags=re.DOTALL)
    if mat:
        fco = mat.group(1)
    
    articles.append({
        "filename": filename,
        "title": title,
        "tags": tags,
        "date": dte,
        "content": fco,
    })
    
    document = {
        "filename": filename,
        "title": title,
        "tags": tags,
        "date": dte.isoformat(),
        "content": fco,
    }
    
    res = es.index(
        index=INDEX, 
        id=str(uuid.uuid1()), 
        body=json.dumps(document), 
        doc_type=TYPE
    )
    print(res)

