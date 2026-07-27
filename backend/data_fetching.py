from decimal import Decimal
from nba_api.stats.endpoints import playergamelog
from db import save_game_batch

def calculate_ts_pct(pts: float, fga: float, fta: float) -> float:
    # Calculates True Shooting Percentage
    tsa = fga + (0.44 * fta)
    if tsa == 0:
        return 0.0
    return round((pts / (2 * tsa)) * 100, 1)

def fetch_and_store_player(player_id: str, player_name: str, season: str = '2025-26') -> int:
    # Fetches regular season and playoff stats from nba_api and saves them to DynamoDB
    season_types = ['Regular Season', 'Playoffs']
    items_to_save = []

    for s_type in season_types:
        try:
            log = playergamelog.PlayerGameLog(
                player_id=player_id, 
                season=season, 
                season_type_all_star=s_type
            )
            df = log.get_data_frames()[0]
            if not df.empty:
                for _, row in df.iterrows():
                    pts = float(row['PTS'])
                    fga = float(row['FGA'])
                    fta = float(row['FTA'])
                    ts_pct = calculate_ts_pct(pts, fga, fta)

                    item = {
                        'PlayerID': str(player_id),
                        'GameDate': str(row['GAME_DATE']),
                        'PlayerName': player_name,
                        'Matchup': str(row['MATCHUP']),
                        'WL': str(row['WL']),
                        'SeasonType': s_type,
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
                    items_to_save.append(item)
        except Exception as e:
            print(f"Error fetching {s_type} for {player_name}: {e}")

    if items_to_save:
        return save_game_batch(items_to_save)
    return 0