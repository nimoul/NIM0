-- Add BYOK provider API key columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_key_encrypted VARCHAR(512);
ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_key_iv VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS anthropic_key_encrypted VARCHAR(512);
ALTER TABLE users ADD COLUMN IF NOT EXISTS anthropic_key_iv VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_key_encrypted VARCHAR(512);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_key_iv VARCHAR(64);
