-- =============================================
-- VEIL Stealth Payment System - Supabase Schema
-- =============================================
-- Run this in Supabase SQL Editor

-- Payment Events Table
-- Stores all PaymentReceived events from blockchain
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    plan_id INTEGER NOT NULL,
    stealth_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    duration INTEGER NOT NULL,
    timestamp BIGINT NOT NULL,
    ephemeral_pub_key TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash TEXT UNIQUE NOT NULL,
    
    -- Claim tracking
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    claimed_tx TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Domains Table
CREATE TABLE IF NOT EXISTS domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_hash TEXT UNIQUE NOT NULL,
    domain_name TEXT NOT NULL,
    owner_address TEXT NOT NULL,
    spend_pub_key TEXT NOT NULL,
    view_pub_key TEXT NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexer State Table
-- Tracks last scanned block for resuming
CREATE TABLE IF NOT EXISTS indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_block_payments BIGINT DEFAULT 0,
    last_block_domains BIGINT DEFAULT 0,
    last_block_commitments BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize indexer state
INSERT INTO indexer_state (id, last_block_payments, last_block_domains, last_block_commitments)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Commitments Table
CREATE TABLE IF NOT EXISTS commitments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    commitment_hash TEXT UNIQUE NOT NULL,
    merchant_id TEXT,
    plan_id INTEGER,
    expires_at BIGINT,
    posted_at BIGINT NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_merchant_id ON payments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payments_stealth_address ON payments(stealth_address);
CREATE INDEX IF NOT EXISTS idx_payments_claimed ON payments(claimed);
CREATE INDEX IF NOT EXISTS idx_payments_block_number ON payments(block_number);
CREATE INDEX IF NOT EXISTS idx_domains_owner ON domains(owner_address);
CREATE INDEX IF NOT EXISTS idx_domains_hash ON domains(domain_hash);

-- Row Level Security (optional but recommended)
-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexer_state ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon key can read)
CREATE POLICY "Allow public read" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON domains FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON commitments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON indexer_state FOR SELECT USING (true);

-- Only service role can insert/update (indexer uses service key)
CREATE POLICY "Service role insert" ON payments FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role update" ON payments FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role insert" ON domains FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role update" ON domains FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role insert" ON commitments FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role update" ON indexer_state FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- x402 Payment Protocol Tables
-- =============================================

-- x402 Payments Table
-- Stores payments made via x402 protocol
CREATE TABLE IF NOT EXISTS x402_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tx_hash TEXT UNIQUE NOT NULL,
    service TEXT NOT NULL,
    amount TEXT NOT NULL,
    payer_address TEXT NOT NULL,
    recipient_address TEXT NOT NULL DEFAULT '',
    request_id TEXT,
    timestamp BIGINT NOT NULL,
    status TEXT DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for x402 payments
CREATE INDEX IF NOT EXISTS idx_x402_tx_hash ON x402_payments(tx_hash);
CREATE INDEX IF NOT EXISTS idx_x402_payer ON x402_payments(payer_address);
CREATE INDEX IF NOT EXISTS idx_x402_service ON x402_payments(service);
CREATE INDEX IF NOT EXISTS idx_x402_status ON x402_payments(status);

-- RLS for x402 payments
ALTER TABLE x402_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON x402_payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON x402_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role update" ON x402_payments FOR UPDATE USING (auth.role() = 'service_role');
