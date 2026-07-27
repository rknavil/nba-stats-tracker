from flask import Flask, jsonify
from flask_cors import CORS
from decimal import Decimal
from nba_api.stats.static import players
from db import fetch_recent_games
from data_fetching import fetch_and_store_player

app = Flask(__name__)
CORS(app)

# helper function to convert decimal objects to an int or float
def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    if isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj

@app.route('/api/stats/<player_name>', methods=['GET'])
def get_player_stats(player_name):
    try:
        # Convert player name to their unique ID
        all_players = players.get_players()
        matched = [p for p in all_players if player_name.lower() in p['full_name'].lower()]
        
        if not matched:
            return jsonify({'status': 'error', 'message': f'Player "{player_name}" not found.'}), 404
        
        player = matched[0]
        player_id = str(player['id'])
        
        # Check DynamoDB first to see if player's recent games are cached
        cached_games = fetch_recent_games(player_id, limit=10)
        if cached_games:
            return jsonify({
                'status': 'success',
                'source': 'dynamodb_cache',
                'data': convert_decimals(cached_games)
            }), 200

        # If missing from DynamoDB, fetch from NBA API & store
        fetch_and_store_player(player_id, player['full_name'])
        
        # Query DynamoDB again
        new_games = fetch_recent_games(player_id, limit=10)
        return jsonify({
            'status': 'success',
            'source': 'nba_api_ingested',
            'data': convert_decimals(new_games)
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)