import { useState, useEffect, useMemo } from 'react';

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
  const [searchTerm, setSearchTerm] = useState('LeBron James');
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
      const res = await fetch(`http://127.0.0.1:5001/api/stats/${encodeURIComponent(playerQuery)}`);
      const result = await res.json();
      
      if (result.status === 'success') {
        setGames(result.data);
        setDataSource(result.source);
      } else {
        setError(result.message || 'Player not found or data error.');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to connect to Flask server. Ensure app.py is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(searchTerm);
  }, []);

  // Handler for form submission (Triggers on Enter key or button click)
  const handleSearch = (e) => {
    e.preventDefault();
    fetchStats(searchTerm);
  };

  // Sort games by most recent date
  const sortedGames = useMemo(() => {
    if (!Array.isArray(games)) return [];
    return [...games].sort((a, b) => {
      const dateA = new Date(a.GameDate).getTime();
      const dateB = new Date(b.GameDate).getTime();
      return dateB - dateA; // Descending order (newest first)
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
          Recent Game Box Scores & Shooting Stats (2025-26 Season)
        </p>
      </header>

      {/* Search Bar wrapped in a <form> to handle Enter key presses */}
      <form onSubmit={handleSearch} style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '2rem' }}>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter player name..." 
          style={{ 
            padding: '0.75rem 1rem', 
            fontSize: '0.95rem', 
            borderRadius: '6px', 
            border: '1px solid #334155',
            width: '300px',
            backgroundColor: '#0f172a',
            color: '#fff',
            outline: 'none'
          }}
        />
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

      {/* Data Badge */}
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

      {error && (
        <div style={{ color: '#f87171', textAlign: 'center', marginBottom: '2rem', padding: '0.75rem', backgroundColor: '#450a0a', borderRadius: '6px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Game Cards Grid */}
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
              {/* Header */}
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

              {/* Top Stat Row: PTS -> REB -> AST -> TS% (Far Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <StatItem label="PTS" value={g.Points ?? '-'} primary />
                <StatItem label="REB" value={g.Rebounds ?? '-'} primary />
                <StatItem label="AST" value={g.Assists ?? '-'} primary />
                <StatItem label="TS%" value={g.TrueShootingPct ? `${g.TrueShootingPct}%` : '-'} primary highlight />
              </div>

              {/* Detailed Box Score with Fallback values */}
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