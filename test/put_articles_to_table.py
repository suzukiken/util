import os, sys
import re
from datetime import date
import boto3
from botocore.config import Config

# get articles from blog

path = "/home/ec2-user/environment/blog/content/aws"
dirs = os.listdir( path )

tiexp = 'title = "(.+?)"'
tgexp = 'tags = \[(.+?)\]'
dtexp = 'date = "(.+?)"'
coexp = '\n[+]{3}\n(.*)'

# put articles to algolia

config = Config(retries={'max_attempts': 10, 'mode': 'standard'})
resource = boto3.resource('dynamodb', config=config)
table = resource.Table(os.environ.get('TABLENAME'))

articles = []

for filename in dirs:
    fpt = os.path.join(path, filename)
    fop = open(fpt, 'r')
    fco = fop.read()
    
    mat = re.search(tiexp, fco)
    if mat:
        title = mat.group(1)
        
    mat = re.search(tgexp, fco)
    if mat:
        found = mat.group(1)
        tags = [stg.replace('"', '').strip() for stg in found.split(',')]
        
    mat = re.search(dtexp, fco)
    if mat:
        found = mat.group(1)
        dte = date.fromisoformat(found)
    
    mat = re.search(coexp, fco, flags=re.DOTALL)
    if mat:
        fco = mat.group(1)
    
    articles.append({
        'filename': filename,
        'title': title,
        'tags': tags,
        'date': dte,
        'content': fco,
    })
    
    item = {
        'id': 'blog/{}'.format(filename),
        'title': title,
        'tags': tags,
        'date': dte.isoformat(),
        'content': fco,
    }
    
    response = table.put_item(
        Item=item,
        ReturnValues='NONE',
        ReturnConsumedCapacity='TOTAL')