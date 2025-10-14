import { useState, useEffect } from 'react';
import { fetchLeaderboard, UserPnl } from '../lib/api';

export default function Leaderboard() {
  const [data, setData] = useState<UserPnl[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      try {
        const result = await fetchLeaderboard(limit, page);
        setData(result);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [page, limit]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Leaderboard PNL</h1>
      <div>
        <label>Entries per page: </label>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Wallet Address</th>
              <th>PNL</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.wallet_address}>
                <td>{entry.rank}</td>
                <td>{entry.wallet_address}</td>
                <td>{entry.pnl.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div>
        <button onClick={() => setPage(prev => Math.max(prev - 1, 1))}>Prev</button>
        <span> Page {page} </span>
        <button onClick={() => setPage(prev => prev + 1)}>Next</button>
      </div>
    </div>
  );
}