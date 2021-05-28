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
INDEX = 'test-index'
TYPE = 'doc'

HOST = ENDPOINT.replace('https://', '')

es = Elasticsearch(
    hosts=[{'host': HOST, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

field = 'content_search'

query_simple = {
    "query": {
        "match": {
            "content_search": "Elasticsearch"
        }
    }
}
query_all_asc = {
    "query": {
        "match_all": {}
    },
    "sort": {
        "lank": {
            "order": "asc"
        }
    }
}
query_all_desc = {
    "query": {
        "match_all": {}
    },
    "sort": {
        "lank": {
            "order": "desc"
        }
    }
}
query_phrase = {
    "query": {
        "match_phrase": {
            "content_search": "証認"
        }
    }
}
query_highlight = {
    "query": {
        "match": {
            "content_search": {
                "query": "Cognito"
            }
        }
    },
    "highlight": {
        "fields": {
            "content_search": {}
        }
    }
}
query_and = {
    "query": {
        "match": {
            "content_search": {
                "query": "Cognito Google",
                "operator": "and"
            }
        }
    }
}
query_or = {
    "query": {
        "match": {
            "content_search": {
                "query": "Cognito Google",
                "operator": "or"
            }
        }
    }
}
query_fuzzy = {
    "query": {
        "match": {
            "content_search": {
                "query": "Cognition",
                "fuzziness": 2
            }
        }
    }
}
query_sort_desc = {
    "query": {
        "match": {
            "content_search": {
                "query": "Elasticsearch"
            }
        }
    },
    "sort": {
        "lank": {
            "order": "desc"
        }
    }
}
query_sort_asc = {
    "query": {
        "match": {
            "content_search": {
                "query": "Elasticsearch"
            }
        }
    },
    "sort": {
        "lank": {
            "order": "asc"
        }
    }
}
query_multi_field = {
    "query": {
        "multi_match" : {
            "query": "Cognito", 
            "fields": [ "title", "content_search" ] 
        }
    }
}
query_boost = {
    "query": {
        "multi_match" : {
            "query": "Cognito", 
            "fields": [ "title", "content_search^10" ] 
        }
    }
}

queries = (
#    query_simple,
#    query_all_asc,
#    query_all_desc,
#    query_phrase,
#    query_highlight,
#    query_and,
#    query_or,
#    query_fuzzy,
#    query_sort_desc,
#    query_sort_asc,
    query_multi_field,
    query_boost,
)

for query in queries:

    res = es.search(
        index=INDEX,
        doc_type=TYPE,
        body=query
    )
    
    pprint('--------')
    
    #pprint(res)

    for hit in res['hits']['hits']:
        if "highlight" in hit:
            pprint(hit["highlight"])
        pprint('{} {}'.format(hit["_source"]['title'], hit["_id"]))
