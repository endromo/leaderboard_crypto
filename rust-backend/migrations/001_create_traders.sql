-- Migration: Create traders table
CREATE TABLE IF NOT EXISTS traders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,  -- ✅ Optimized length
    created_at TIMESTAMPTZ DEFAULT NOW(),        -- ✅ Consistent naming
    last_active TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for traders table
CREATE INDEX IF NOT EXISTS idx_trader_wallet ON traders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_traders_last_active ON traders(last_active);