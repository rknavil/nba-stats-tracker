import json
import boto3
from decimal import Decimal
from nba_api.stats.static import players
from nba_api.stats.endpoints import playergamelog

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('NBA_Player_Stats')

# helper function to calculate true shooting percentage
def calculate_ts_pct(pts, fga, fta):
    tsa = fga + (0.44 * fta)
    if tsa == 0:
        return 0.0
    ts_pct = (pts / (2 * tsa)) * 100
    return round(ts_pct, 1)

# handler function for AWS Lambda that fetches and stores player game logs
def lambda_handler(event, context):
    player_name = event.get('player_name', 'LeBron James')
    season = event.get('season', '2025-26')
    
    # gets player ID from provided player name
    all_players = players.get_players()
    matched = [p for p in all_players if p['full_name'].lower() == player_name.lower()]
    if not matched:
        return {'statusCode': 404, 'body': json.dumps({'error': f'Player "{player_name}" not found.'})}
    
    player_id = str(matched[0]['id'])
    full_name = matched[0]['full_name']
    
    season_types = ['Regular Season', 'Playoffs']
    all_game_rows = []
    
    # fetches game logs for both regular season and playoffs
    for s_type in season_types:
        try:
            log = playergamelog.PlayerGameLog(
                player_id=player_id, 
                season=season, 
                season_type_all_star=s_type
            )
            df = log.get_data_frames()[0]
            if not df.empty:
                df['SEASON_TYPE'] = s_type
                all_game_rows.append(df)
        except Exception as e:
            print(f"Error fetching {s_type}: {str(e)}")

    if not all_game_rows:
        return {'statusCode': 200, 'body': json.dumps({'message': f'No game logs found for {full_name}.'})}

    written_count = 0
    # writes to DynamoDB in batches for better performance
    with table.batch_writer() as batch:
        for df in all_game_rows:
            for _, row in df.iterrows():
                pts = float(row['PTS'])
                fga = float(row['FGA'])
                fta = float(row['FTA'])
                
                ts_pct = calculate_ts_pct(pts, fga, fta)

                item = {
                    'PlayerID': player_id,
                    'GameDate': str(row['GAME_DATE']),
                    'PlayerName': full_name,
                    'Matchup': str(row['MATCHUP']),
                    'WL': str(row['WL']),
                    'SeasonType': str(row['SEASON_TYPE']),
                    'Minutes': str(row['MIN']),
                    'Points': Decimal(str(row['PTS'])),
                    'Rebounds': Decimal(str(row['REB'])),
                    'Assists': Decimal(str(row['AST'])),
                    'Steals': Decimal(str(row['STL'])),
                    'Blocks': Decimal(str(row['BLK'])),
                    'Turnovers': Decimal(str(row['TOV'])),
                    'PlusMinus': Decimal(str(row['PLUS_MINUS'])),
                    'TrueShootingPct': Decimal(str(ts_pct))
                }
                batch.put_item(Item=item)
                written_count += 1

    # returns a success message upon completion
    return {
        'statusCode': 200,
        'body': json.dumps({'message': f'Stored {written_count} games for {full_name}.'})
    }