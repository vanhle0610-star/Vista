ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_code varchar(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_bin varchar(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number varchar(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name varchar(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS travel_preferences jsonb NOT NULL DEFAULT '[]'::jsonb;
