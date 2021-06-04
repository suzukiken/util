import boto3
import os
import re
import json


def lambda_handler(event, context):
    print(event)
    
    content = event['arguments']['content']
    
    return content