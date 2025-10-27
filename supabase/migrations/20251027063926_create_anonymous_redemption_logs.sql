-- Create table for logging anonymous voucher redemptions
CREATE TABLE IF NOT EXISTS anonymous_redemption_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    voucher_code TEXT NOT NULL,
    credits_redeemed INTEGER NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    location JSONB, -- Optional location data (latitude, longitude, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on device_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_redemption_logs_device_id ON anonymous_redemption_logs(device_id);

-- Create index on voucher_code for tracking voucher usage
CREATE INDEX IF NOT EXISTS idx_anonymous_redemption_logs_voucher_code ON anonymous_redemption_logs(voucher_code);

-- Create index on redeemed_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_anonymous_redemption_logs_redeemed_at ON anonymous_redemption_logs(redeemed_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE anonymous_redemption_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserts (for logging redemptions)
CREATE POLICY "Allow anonymous redemption logging" ON anonymous_redemption_logs
    FOR INSERT WITH CHECK (true);

-- Policy to allow reads for service role (for analytics/admin purposes)
CREATE POLICY "Allow service role reads" ON anonymous_redemption_logs
    FOR SELECT USING (auth.role() = 'service_role');