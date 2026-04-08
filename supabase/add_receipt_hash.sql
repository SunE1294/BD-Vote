-- Add receipt_hash column to votes table
-- This stores the blockchain receipt hash for each vote
-- Voters can use this to verify their vote exists on-chain

ALTER TABLE votes ADD COLUMN IF NOT EXISTS receipt_hash text;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS network text DEFAULT 'Base Sepolia';

-- Create index for fast receipt lookups
CREATE INDEX IF NOT EXISTS idx_votes_receipt_hash ON votes(receipt_hash);

-- Update status column default to 'confirmed' (no more simulated)
-- ALTER TABLE votes ALTER COLUMN status SET DEFAULT 'confirmed';

COMMENT ON COLUMN votes.receipt_hash IS 'Unique receipt hash from blockchain - voter can verify their vote with this';
COMMENT ON COLUMN votes.network IS 'Blockchain network where vote was recorded (e.g. Base Sepolia)';
