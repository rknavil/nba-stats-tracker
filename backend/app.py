import difflib
from flask import Flask, jsonify, request
from flask_cors import CORS
from decimal import Decimal
from nba_api.stats.static import players
from db import fetch_recent_games
from data_fetching import fetch_and_store_player

app = Flask(__name__)
CORS(app)

# Helper function to convert decimal objects to an int or float
def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    if isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj

def find_best_player_match(query_name):
    query_clean = query_name.strip().lower()
    
    # Common nicknames for nba players
    nicknames = {
        'steph': 'stephen curry',
        'steph curry': 'stephen curry',
        'luka': 'luka doncic',
        'giannis': 'giannis antetokounmpo',
        'shai': 'shai gilgeous-alexander',
        'sga': 'shai gilgeous-alexander',
        'kat': 'karl-anthony towns',
        'bam': 'bam adebayo',
        'd-book': 'devin booker',
        'booker': 'devin booker'
    }
    
    if query_clean in nicknames:
        query_clean = nicknames[query_clean]

    all_players = players.get_players()
    
    # Direct name check
    exact_matches = [
        p for p in all_players 
        if query_clean in p['full_name'].lower() 
        or query_clean in p['first_name'].lower() 
        or query_clean in p['last_name'].lower()
    ]
    if exact_matches:
        return exact_matches[0]

    # Fuzzy name matching via difflib library
    player_names = [p['full_name'] for p in all_players]
    close_matches = difflib.get_close_matches(query_clean, player_names, n=1, cutoff=0.5)
    
    if close_matches:
        best_name = close_matches[0]
        matched_player = next(p for p in all_players if p['full_name'] == best_name)
        return matched_player

    return None

@app.route('/api/stats/<player_name>', methods=['GET'])
def get_player_stats(player_name):
    try:
        # Extract filter query parameters from frontend request
        limit = request.args.get('limit', default=10, type=int)
        season_type = request.args.get('season_type', default='Both', type=str)
        season = request.args.get('season', default='2025-26', type=str)

        # Find player using direct + fuzzy matching
        player = find_best_player_match(player_name)
        
        if not player:
            return jsonify({'status': 'error', 'message': f'Player "{player_name}" not found.'}), 404
        
        player_id = str(player['id'])
        player_full_name = player['full_name']
        
        # Check DynamoDB using player ID, season, season type, and limit filters
        cached_games = fetch_recent_games(
            player_id, 
            season=season, 
            season_type=season_type, 
            limit=limit
        )

        # Cache Hit: Only return cache if we have at least the requested number of games
        if cached_games and len(cached_games) >= limit:
            return jsonify({
                'status': 'success',
                'source': 'dynamodb_cache',
                'player_matched': player_full_name,
                'data': convert_decimals(cached_games)
            }), 200

        # Cache Miss: Fetch missing/extended dataset directly from NBA API & store in DynamoDB
        new_games = fetch_and_store_player(
            player_id, 
            player_full_name, 
            season=season, 
            season_type=season_type, 
            limit=limit
        )
        
        return jsonify({
            'status': 'success',
            'source': 'nba_api_ingested',
            'player_matched': player_full_name,
            'data': convert_decimals(new_games)
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)