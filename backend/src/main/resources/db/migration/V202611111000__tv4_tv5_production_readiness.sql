-- TV4 & TV5 Production Readiness Migration
-- 1. Payout Accounts for VietQR (Mục tiêu 1)
CREATE TABLE IF NOT EXISTS payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_code varchar(20) NOT NULL,
  account_number varchar(64) NOT NULL,
  account_name varchar(150) NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  verification_status varchar(20) NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT uq_payout_account UNIQUE (user_id, bank_code, account_number)
);

CREATE INDEX IF NOT EXISTS idx_payout_accounts_user ON payout_accounts(user_id, is_default);

-- 2. Settlement Payment Requests (Mục tiêu 1)
CREATE TABLE IF NOT EXISTS settlement_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  payout_account_id uuid NOT NULL REFERENCES payout_accounts(id),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'VND' CHECK (currency = 'VND'),
  memo varchar(100) NOT NULL,
  qr_content text NOT NULL,
  qr_image_url text,
  bank_code varchar(20) NOT NULL,
  masked_account_number varchar(64) NOT NULL,
  recipient_account_name varchar(150) NOT NULL,
  idempotency_key varchar(64) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED', 'OPENED', 'PAYER_MARKED_SENT', 'RECIPIENT_CONFIRMED', 'CANCELLED', 'EXPIRED')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT uq_settlement_payment_request UNIQUE (trip_id, payer_id, recipient_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_settlement_payment_requests_trip ON settlement_payment_requests(trip_id, status);

-- 3. Currency and Amount Constraints (Mục tiêu 4)
UPDATE expenses SET currency = 'VND' WHERE currency IS NULL OR currency <> 'VND';
UPDATE trips SET currency = 'VND' WHERE currency IS NULL OR currency <> 'VND';

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS ck_expenses_currency_vnd;
ALTER TABLE expenses ADD CONSTRAINT ck_expenses_currency_vnd CHECK (currency = 'VND');

ALTER TABLE trips DROP CONSTRAINT IF EXISTS ck_trips_currency_vnd;
ALTER TABLE trips ADD CONSTRAINT ck_trips_currency_vnd CHECK (currency = 'VND');

-- 4. Content Report Active Partial Unique Index (Mục tiêu 5)
CREATE UNIQUE INDEX IF NOT EXISTS uq_content_reports_active
  ON content_reports (reporter_id, target_type, target_id)
  WHERE status IN ('OPEN', 'PENDING');

-- 5. Session ID for Location Shares (Mục tiêu 2)
ALTER TABLE location_shares ADD COLUMN IF NOT EXISTS session_id uuid;

-- 6. Persistent AI Rate Limits Table (Mục tiêu 3)
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_key varchar(128) NOT NULL,
  window_start timestamptz NOT NULL,
  window_type varchar(20) NOT NULL CHECK (window_type IN ('MINUTE', 'HOUR', 'DAY')),
  request_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_rate_limits UNIQUE (limit_key, window_start, window_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_lookup ON ai_rate_limits(limit_key, window_type, window_start);
