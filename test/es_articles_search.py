import requests
from requests_aws4auth import AWS4Auth
import os
from elasticsearch import Elasticsearch, RequestsHttpConnection
import boto3
import json
from pprint import pprint

region = 'ap-northeast-1' 
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

ENDPOINT = os.environ.get('ES_ENDPOINT')
INDEX = 'article-index'
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
            "content": {
                "query": "CodePipeline"
            }
        }
    }
}

body2 = {
    "from": 0,
    "size": 1000,
    "query": {
        "match_all": {
        }
    },
    "sort": {
        "lank": {
            "order": "asc"
        }
    }
}

body3 = {
    "from": 0,
    "size": 1000,
    "query": {
        "match_phrase": {
            "content": "根拠"
        }
    }
}

# Good
body8 = {
    "from": 0,
    "size": 2,
    "query": {
        "match": {
            "content": {
                "query": "Cognito"
            }
        }
    },
    "highlight": {
        "fields": {
            "content": {}
        }
    }
}

# Good
body5 = {
    "from": 0,
    "size": 1000,
    "query": {
        "match": {
            "content": {
                "query": "IdPool Google Cognito",
                "operator": "and"
            }
        }
    }
}

# Good!!!!
body7 = {
    "from": 0,
    "size": 1000,
    "query": {
        "match": {
            "content": {
                "query": "concurrent",
                "fuzziness": 2
            }
        }
    }
}


body9 = {
    "from": 0,
    "size": 100,
    "query": {
        "match": {
            "content": {
                "query": "Cognito"
            }
        }
    },
    "sort": {
        "lank": {
            "order": "desc"
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
    body=body2
)

#pprint(res)

for hit in res['hits']['hits']:
    pprint('{} {}'.format(hit["_source"]['title'], hit["_id"]))
