from decimal import Decimal
import pandas as pd
from nba_api.stats.endpoints import playergamelog
from db import _table

def fetch_and_store_player(player_id, player_name):
    player_id = str(player_id)
    
    # 1. Fetch Regular Season Games
    gamelog_reg = playergamelog.PlayerGameLog(
        player_id=player_id, 
        season='2025-26', 
        season_type_all_star='Regular Season'
    )
    df_reg = gamelog_reg.get_data_frames()[0]
    if not df_reg.empty:
        df_reg['SeasonType'] = 'Regular Season'

    # 2. Fetch Playoff Games
    gamelog_post = playergamelog.PlayerGameLog(
        player_id=player_id, 
        season='2025-26', 
        season_type_all_star='Playoffs'
    )
    df_post = gamelog_post.get_data_frames()[0]
    if not df_post.empty:
        df_post['SeasonType'] = 'Playoffs'

    # Combine both DataFrames
    df_combined = pd.concat([df_post, df_reg], ignore_index=True)
    
    if df_combined.empty:
        return []

    # Sort strictly by date descending (format='mixed' handles all date formats safely)
    df_combined['ParsedDate'] = pd.to_datetime(df_combined['GAME_DATE'], format='mixed')
    df_combined = df_combined.sort_values(by='ParsedDate', ascending=False)

    games = []
    # Take the 10 most recent games overall
    for _, row in df_combined.head(10).iterrows():
        fgm = float(row['FGM'])
        fga = float(row['FGA'])
        ftm = float(row['FTM'])
        fta = float(row['FTA'])
        pts = float(row['PTS'])
        
        # Calculate True Shooting Percentage
        ts_denom = 2 * (fga + 0.44 * fta)
        ts_pct = round((pts / ts_denom) * 100, 1) if ts_denom > 0 else 0.0

        fg_pct = round(float(row['FG_PCT']) * 100, 1) if row['FG_PCT'] is not None else 0.0
        fg3_pct = round(float(row['FG3_PCT']) * 100, 1) if row['FG3_PCT'] is not None else 0.0

        game_data = {
            'PlayerID': str(player_id),
            'PlayerName': str(player_name),
            'GameDate': str(row['GAME_DATE']),
            'Matchup': str(row['MATCHUP']),
            'WL': str(row['WL']),
            'SeasonType': str(row['SeasonType']),
            'Points': int(pts),
            'Rebounds': int(row['REB']),
            'Assists': int(row['AST']),
            'TrueShootingPct': Decimal(str(ts_pct)),
            'FGM': int(fgm),
            'FGA': int(fga),
            'FG_PCT': Decimal(str(fg_pct)),
            'FG3M': int(row['FG3M']),
            'FG3A': int(row['FG3A']),
            'FG3_PCT': Decimal(str(fg3_pct)),
            'FTM': int(ftm),
            'FTA': int(fta),
            'Minutes': int(row['MIN']),
            'Steals': int(row['STL']),
            'Blocks': int(row['BLK']),
            'Turnovers': int(row['TOV'])
        }

        # Put item into DynamoDB
        _table.put_item(Item=game_data)
        games.append(game_data)
        
    return games