import boto3
from botocore.config import Config
import uuid
from datetime import date, timedelta

TABLE_NAME = 'util-table'

config = Config(retries={'max_attempts': 10, 'mode': 'standard'})

resource = boto3.resource('dynamodb', config=config)
table = resource.Table(TABLE_NAME)

for i in range(620, 630):
    theid = str(uuid.uuid1())
    dt = date.today() - timedelta(days=1)
    item = {
        'id': 'fiction-{}'.format(theid),
        'sku': i,
        'name': 'AEG-{}'.format(i-200),
        'pcs': 0,
        'ship': dt.strftime('%Y-%m-%d')
    }
    response = table.put_item(
        Item=item,
        ReturnValues='NONE',
        ReturnConsumedCapacity='TOTAL')
    