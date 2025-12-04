-- Migration: Create trader performance table
CREATE TABLE IF NOT EXISTS trader_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    account_value DECIMAL(30, 18) NOT NULL DEFAULT 0,  -- ✅ High precision
    pnl DECIMAL(30, 18) NOT NULL DEFAULT 0,            -- ✅ High precision
    roi DECIMAL(10, 4) NOT NULL DEFAULT 0,             -- ✅ 4 decimal places
    volume DECIMAL(30, 18) NOT NULL DEFAULT 0,         -- ✅ High precision
    timeframe VARCHAR(10) DEFAULT 'daily',             -- ✅ Optimized length
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trader_id, timeframe, calculated_at)        -- ✅ Prevent duplicates
);
-- Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_trader ON trader_performance(trader_id);
CREATE INDEX IF NOT EXISTS idx_performance_timeframe ON trader_performance(timeframe);
CREATE INDEX IF NOT EXISTS idx_performance_calculated ON trader_performance(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_roi ON trader_performance(roi DESC);  -- ✅ For leaderboard
CREATE INDEX IF NOT EXISTS idx_performance_pnl ON trader_performance(pnl DESC);  -- ✅ For leaderboard