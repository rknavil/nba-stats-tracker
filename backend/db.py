import os
import boto3
from boto3.dynamodb.conditions import Key

REGION = os.getenv('AWS_REGION', 'us-east-1')
TABLE_NAME = os.getenv('DYNAMODB_TABLE', 'NBA_Player_Stats')

_dynamodb = boto3.resource('dynamodb', region_name=REGION)
_table = _dynamodb.Table(TABLE_NAME)

def fetch_recent_games(player_id: str, limit: int = 10) -> list:
    # Queries DynamoDB for the 10 most recent games of a player
    try:
        response = _table.query(
            KeyConditionExpression=Key('PlayerID').eq(str(player_id)),
            ScanIndexForward=False,  # Sorts newest games first
            Limit=limit
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"[DB Error] Query failed for PlayerID {player_id}: {e}")
        return []

def save_game_batch(games: list) -> int:
    # Batch inserts formatted games into DynamoDB
    written = 0
    with _table.batch_writer() as batch:
        for game in games:
            batch.put_item(Item=game)
            written += 1
    return written