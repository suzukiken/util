import boto3
from botocore.config import Config

TABLE_NAME = "util-table"

config = Config(retries={"max_attempts": 10, "mode": "standard"})

resource = boto3.resource("dynamodb", config=config)
table = resource.Table(TABLE_NAME)

item = {
    "id": "1",
    "value": [
        "suzuki",
        "鈴木",
        "スズキ",
        "1212422"
    ],
}
response = table.put_item(
    Item=item,
    ReturnValues="NONE",
    ReturnConsumedCapacity="TOTAL")
    
item = {
    "id": "2",
    "value": {
        "english": "suzuki",
        "kanji": "鈴木",
        "katakana": "スズキ",
        "number": "1212422"
    },
}
response = table.put_item(
    Item=item,
    ReturnValues="NONE",
    ReturnConsumedCapacity="TOTAL")