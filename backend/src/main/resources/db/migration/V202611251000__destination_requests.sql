CREATE TABLE destination_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type varchar(20) NOT NULL CHECK (request_type IN ('CREATE', 'UPDATE')),
    target_destination_id uuid REFERENCES destinations(id) ON DELETE SET NULL,
    submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(200),
    province_name varchar(120),
    category_name varchar(120),
    description text,
    address varchar(300),
    latitude numeric(9,6),
    longitude numeric(9,6),
    price_min numeric(15,2),
    price_max numeric(15,2),
    opening_hours jsonb,
    image_urls jsonb,
    source_url text,
    note text,
    status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason text,
    reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0,
    CHECK (price_min IS NULL OR price_min >= 0),
    CHECK (price_max IS NULL OR price_max >= 0),
    CHECK (price_min IS NULL OR price_max IS NULL OR price_max >= price_min)
);

CREATE INDEX idx_destination_requests_status_created
    ON destination_requests (status, created_at DESC);

CREATE INDEX idx_destination_requests_submitted_created
    ON destination_requests (submitted_by, created_at DESC);

CREATE INDEX idx_destination_requests_target_dest
    ON destination_requests (target_destination_id);
