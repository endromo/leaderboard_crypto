-- Migration: Create materialized view for real-time leaderboard
CREATE MATERIALIZED VIEW IF NOT EXISTS realtime_leaderboard AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY tp.roi DESC) as rank,
    t.wallet_address as trader_wallet,
    tp.account_value,
    tp.pnl,
    tp.roi,
    tp.volume,
    tp.calculated_at as last_updated
FROM traders t
INNER JOIN trader_performance tp ON t.id = tp.trader_id
WHERE tp.timeframe = 'daily'
ORDER BY tp.roi DESC;
-- Indexes for materialized view
CREATE INDEX IF NOT EXISTS idx_realtime_leaderboard_rank ON realtime_leaderboard(rank);  -- ✅ Fast rank lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_realtime_leaderboard_wallet ON realtime_leaderboard(trader_wallet);  -- ✅ Unique wallet