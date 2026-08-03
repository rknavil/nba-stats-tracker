from decimal import Decimal
import pandas as pd
from nba_api.stats.endpoints import playergamelog
from db import _table

def fetch_and_store_player(player_id, player_name, season='2025-26', season_type='Both', limit=10):
    player_id = str(player_id)
    
    # Store fetched DataFrames for processing
    gamelogs = []

    # Determine which season types to query based on requested filter
    types_to_fetch = []
    if season_type in ['Regular Season', 'Both']:
        types_to_fetch.append('Regular Season')
    if season_type in ['Playoffs', 'Both']:
        types_to_fetch.append('Playoffs')

    # Fetch gamelogs dynamically for requested season types
    for s_type in types_to_fetch:
        # Fetch Games based on target season and season type
        gamelog = playergamelog.PlayerGameLog(
            player_id=player_id, 
            season=season, 
            season_type_all_star=s_type
        )
        df = gamelog.get_data_frames()[0]
        if not df.empty:
            df['SeasonType'] = s_type
            gamelogs.append(df)

    # Return empty list if no games were found for any requested type
    if not gamelogs:
        return []

    # Combine all fetched DataFrames into one dataset
    df_combined = pd.concat(gamelogs, ignore_index=True)
    
    if df_combined.empty:
        return []

    # Sort by descending date to get most recent games first
    df_combined['ParsedDate'] = pd.to_datetime(df_combined['GAME_DATE'], format='mixed')
    df_combined = df_combined.sort_values(by='ParsedDate', ascending=False)

    games = []
    # Take the requested limit of most recent games overall
    for _, row in df_combined.head(limit).iterrows():
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
            'Season': str(season), # Store Season year to allow season-specific cache querying
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