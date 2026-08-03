import { useState, useEffect, useMemo } from 'react';

// Creating a reusable stat block for player cards
const StatItem = ({ label, value, primary, highlight }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: primary ? 'center' : 'flex-start',
    padding: primary ? '8px 4px' : '2px 0',
    backgroundColor: highlight ? '#0f172a' : primary ? '#f8fafc' : 'transparent',
    borderRadius: '6px',
    border: highlight ? '1px solid #0f172a' : 'none'
  }}>
    <span style={{
      fontSize: '0.68rem',
      fontWeight: '700',
      color: highlight ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '2px'
    }}>
      {label}
    </span>
    <span style={{
      fontSize: primary ? '1.25rem' : '0.9rem',
      fontWeight: '700',
      color: highlight ? '#ffffff' : '#0f172a'
    }}>
      {value}
    </span>
  </div>
);

function App() {
  // default stats show LeBron James
  const [searchTerm, setSearchTerm] = useState('LeBron James');
  
  const [limit, setLimit] = useState(10);
  const [seasonType, setSeasonType] = useState('Both');
  const [season, setSeason] = useState('2025-26');

  const [games, setGames] = useState([]);
  const [dataSource, setDataSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async (playerQuery) => {
    if (!playerQuery.trim()) return;
    setLoading(true);
    setError(null);
    setGames([]);
    setDataSource('');
    
    try {
      const queryParams = new URLSearchParams({
        limit: limit,
        season_type: seasonType,
        season: season
      });

      // running on port 5001
      const res = await fetch(`http://127.0.0.1:5001/api/stats/${encodeURIComponent(playerQuery)}?${queryParams.toString()}`);
      const result = await res.json();
      
      if (result.status === 'success') {
        setGames(result.data);
        setDataSource(result.source);
      } else {
        setError(result.message || 'Player not found or data error.');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to connect to Flask server. Ensure app.py is running on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(searchTerm);
  }, []);

  // enter or search button functionality
  const handleSearch = (e) => {
    e.preventDefault();
    fetchStats(searchTerm);
  };

  // game cards are from newest to oldest
  const sortedGames = useMemo(() => {
    if (!Array.isArray(games)) return [];
    return [...games].sort((a, b) => {
      const dateA = new Date(a.GameDate).getTime();
      const dateB = new Date(b.GameDate).getTime();
      return dateB - dateA;
    });
  }, [games]);

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2.5rem 1.5rem', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: '700', letterSpacing: '-0.02em', margin: '0 0 0.4rem 0' }}>
          NBA Player Stat Tracker
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
          Recent Game Box Scores & Shooting Stats
        </p>
      </header>

      {/* Main Search & Filter Bar (wraps gracefully on mobile/smaller screens) */}
      <form onSubmit={handleSearch} style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter player name or nickname..." 
          style={{ 
            padding: '0.75rem 1rem', 
            fontSize: '0.95rem', 
            borderRadius: '6px', 
            border: '1px solid #334155',
            width: '260px',
            backgroundColor: '#0f172a',
            color: '#fff',
            outline: 'none'
          }}
        />

        {/* Season year selector */}
        <select 
          value={season} 
          onChange={(e) => setSeason(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.95rem',
            borderRadius: '6px',
            border: '1px solid #334155',
            backgroundColor: '#0f172a',
            color: '#fff',
            outline: 'none',
            cursor: 'pointer'
          }}>
          <option value="2025-26">2025-26 Season</option>
          <option value="2024-25">2024-25 Season</option>
          <option value="2023-24">2023-24 Season</option>
        </select>

        {/* Regular season vs playoffs filter option */}
        <select 
          value={seasonType} 
          onChange={(e) => setSeasonType(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.95rem',
            borderRadius: '6px',
            border: '1px solid #334155',
            backgroundColor: '#0f172a',
            color: '#fff',
            outline: 'none',
            cursor: 'pointer'
          }}>
          <option value="Both">All Games (Reg + Post)</option>
          <option value="Regular Season">Regular Season Only</option>
          <option value="Playoffs">Playoffs Only</option>
        </select>

        {/* Game count cutoff */}
        <select 
          value={limit} 
          onChange={(e) => setLimit(Number(e.target.value))}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.95rem',
            borderRadius: '6px',
            border: '1px solid #334155',
            backgroundColor: '#0f172a',
            color: '#fff',
            outline: 'none',
            cursor: 'pointer'
          }}>
          <option value={5}>Last 5 Games</option>
          <option value={10}>Last 10 Games</option>
          <option value={20}>Last 20 Games</option>
        </select>

        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            padding: '0.75rem 1.25rem', 
            fontSize: '0.95rem', 
            borderRadius: '6px', 
            backgroundColor: '#2563eb', 
            color: '#fff', 
            border: 'none', 
            cursor: loading ? 'default' : 'pointer',
            fontWeight: '600'
          }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Shows if requested player stats are in DynamoDB database */}
      {dataSource && !loading && !error && (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            padding: '4px 10px', 
            borderRadius: '4px', 
            backgroundColor: dataSource === 'dynamodb_cache' ? '#14532d' : '#7c2d12', 
            color: dataSource === 'dynamodb_cache' ? '#86efac' : '#fdba74',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {dataSource === 'dynamodb_cache' ? 'DynamoDB Cache Hit' : 'Fresh Ingestion'}
          </span>
        </div>
      )}

      {/* Error state banner */}
      {error && (
        <div style={{ color: '#f87171', textAlign: 'center', marginBottom: '2rem', padding: '0.75rem', backgroundColor: '#450a0a', borderRadius: '6px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {Array.isArray(sortedGames) && sortedGames.length > 0 ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '1.25rem' 
        }}>
          {sortedGames.map((g, i) => (
            <div key={i} style={{ 
              borderRadius: '8px', 
              padding: '1.25rem', 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Card header showing matchup, date, etc. */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>
                    {g.Matchup}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    {g.GameDate}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {g.SeasonType === 'Playoffs' && (
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '700' }}>
                      POSTSEASON
                    </span>
                  )}
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: '700', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    backgroundColor: g.WL === 'W' ? '#dcfce7' : '#fee2e2',
                    color: g.WL === 'W' ? '#15803d' : '#b91c1c'
                  }}>
                    {g.WL}
                  </span>
                </div>
              </div>

              {/* Row that shows points, rebounds, assists, and TS% */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <StatItem label="PTS" value={g.Points ?? '-'} primary />
                <StatItem label="REB" value={g.Rebounds ?? '-'} primary />
                <StatItem label="AST" value={g.Assists ?? '-'} primary />
                <StatItem label="TS%" value={g.TrueShootingPct ? `${g.TrueShootingPct}%` : '-'} primary highlight />
              </div>

              {/* Detailed box score breakdown with fallbacks in case of missing return values */}
              <div style={{ 
                padding: '0.75rem', 
                backgroundColor: '#f8fafc', 
                borderRadius: '6px', 
                border: '1px solid #f1f5f9'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Shooting & Defense
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <StatItem label="FG" value={g.FGM !== undefined ? `${g.FGM}/${g.FGA}` : 'N/A'} />
                  <StatItem label="FG%" value={g.FG_PCT !== undefined ? `${g.FG_PCT}%` : 'N/A'} />
                  <StatItem label="MIN" value={g.Minutes ?? '-'} />

                  <StatItem label="3PT" value={g.FG3M !== undefined ? `${g.FG3M}/${g.FG3A}` : 'N/A'} />
                  <StatItem label="3P%" value={g.FG3_PCT !== undefined ? `${g.FG3_PCT}%` : 'N/A'} />
                  <StatItem label="STL" value={g.Steals ?? '-'} />

                  <StatItem label="FT" value={g.FTM !== undefined ? `${g.FTM}/${g.FTA}` : 'N/A'} />
                  <StatItem label="BLK" value={g.Blocks ?? '-'} />
                  <StatItem label="TO" value={g.Turnovers ?? '-'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && !error && (
          <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '2rem' }}>
            No recent game data available.
          </div>
        )
      )}
    </div>
  );
}

export default App;