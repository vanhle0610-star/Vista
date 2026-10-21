-- TV3 W4: Them cot created_at va updated_at cho bang itinerary_days
-- (entity ItineraryDay co 2 cot nay nhung baseline schema thieu)
ALTER TABLE itinerary_days
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
