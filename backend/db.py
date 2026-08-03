import os
import boto3
from boto3.dynamodb.conditions import Key, Attr

REGION = os.getenv('AWS_REGION', 'us-east-1')
TABLE_NAME = os.getenv('DYNAMODB_TABLE', 'NBA_Player_Stats')

_dynamodb = boto3.resource('dynamodb', region_name=REGION)
_table = _dynamodb.Table(TABLE_NAME)

def fetch_recent_games(player_id: str, season: str = '2025-26', season_type: str = 'Both', limit: int = 10) -> list:
    # Queries DynamoDB for recent games of a player filtered by season, season type, and limit
    try:
        filter_expression = Attr('Season').eq(season)
        
        # Adding season type filter if user didn't select both
        if season_type != 'Both':
            filter_expression = filter_expression & Attr('SeasonType').eq(season_type)

        response = _table.query(
            KeyConditionExpression=Key('PlayerID').eq(str(player_id)),
            FilterExpression=filter_expression,
            ScanIndexForward=False  # Sorts newest games first
        )
        items = response.get('Items', [])

        # Sorting items by game date descending
        items.sort(key=lambda x: x.get('GameDate', ''), reverse=True)

        # Returning only the requested number of games
        return items[:limit]
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