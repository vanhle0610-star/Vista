-- Match existing contiguous timestamp versions so this runs AFTER V202610191400.
-- Additive delta to V202610171200; retain physical names comments/checkins and post_media.
-- Existing invalid rows intentionally fail validation; TV2 must review rather than auto-delete data.
ALTER TABLE public.posts
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN status_before_hidden varchar(20),
    ADD CONSTRAINT ck_posts_body CHECK (length(btrim(body)) > 0),
    ADD CONSTRAINT ck_posts_status CHECK (status IN ('PENDING', 'VISIBLE', 'HIDDEN')),
    ADD CONSTRAINT ck_posts_hidden CHECK (
        (status = 'HIDDEN' AND status_before_hidden IS NOT NULL
            AND status_before_hidden IN ('PENDING', 'VISIBLE'))
        OR (status <> 'HIDDEN' AND status_before_hidden IS NULL)),
    ADD CONSTRAINT ck_posts_timestamps CHECK (updated_at >= created_at),
    ADD CONSTRAINT ck_posts_version CHECK (version >= 0);

ALTER TABLE public.comments
    ADD COLUMN deleted_at timestamptz,
    ADD CONSTRAINT ck_comments_body CHECK (length(btrim(body)) > 0),
    ADD CONSTRAINT ck_comments_status CHECK (status IN ('VISIBLE', 'HIDDEN')),
    ADD CONSTRAINT ck_comments_timestamps CHECK (updated_at >= created_at);

ALTER TABLE public.checkins
    ALTER COLUMN latitude SET NOT NULL,
    ALTER COLUMN longitude SET NOT NULL,
    ADD CONSTRAINT ck_checkins_latitude CHECK (latitude BETWEEN -90 AND 90),
    ADD CONSTRAINT ck_checkins_longitude CHECK (longitude BETWEEN -180 AND 180);

ALTER TABLE public.location_shares
    ADD COLUMN started_at timestamptz,
    ADD COLUMN stopped_at timestamptz;
-- Existing creation time is the only available start marker; this does not invent new consent.
UPDATE public.location_shares SET started_at = created_at;
ALTER TABLE public.location_shares
    ALTER COLUMN started_at SET DEFAULT now(),
    ALTER COLUMN started_at SET NOT NULL,
    ADD CONSTRAINT ck_location_shares_expiry CHECK (expires_at > started_at),
    ADD CONSTRAINT ck_location_shares_stop CHECK (
        stopped_at IS NULL OR (stopped_at >= started_at AND NOT enabled)),
    ADD CONSTRAINT ck_location_shares_coordinates CHECK (
        (last_latitude IS NULL AND last_longitude IS NULL AND last_updated_at IS NULL)
        OR (last_latitude IS NOT NULL AND last_longitude IS NOT NULL
            AND last_updated_at IS NOT NULL
            AND last_latitude BETWEEN -90 AND 90 AND last_longitude BETWEEN -180 AND 180
            AND last_updated_at >= started_at AND last_updated_at < expires_at)),
    ADD CONSTRAINT ck_location_shares_disabled_cleared CHECK (
        enabled OR (last_latitude IS NULL AND last_longitude IS NULL AND last_updated_at IS NULL));
-- Baseline UNIQUE(trip_id, user_id) is stronger than one-active-session: reuse one current row.
-- Time-dependent expiry is enforced by read predicates/cleanup, never by a now()-based index.

ALTER TABLE public.meetup_points
    ADD COLUMN description text,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
    ADD CONSTRAINT ck_meetup_points_label CHECK (length(btrim(label)) > 0),
    ADD CONSTRAINT ck_meetup_points_latitude CHECK (latitude BETWEEN -90 AND 90),
    ADD CONSTRAINT ck_meetup_points_longitude CHECK (longitude BETWEEN -180 AND 180),
    ADD CONSTRAINT ck_meetup_points_timestamps CHECK (updated_at >= created_at);

-- Retain verified baseline FKs: users(id), trips(id), destinations(id), itinerary_items(id).
-- NO ACTION on authors/optional references; CASCADE on trip-owned rows and post comments/media.
CREATE INDEX idx_posts_public_feed ON public.posts(created_at DESC, id DESC)
    WHERE status = 'VISIBLE' AND deleted_at IS NULL;
CREATE INDEX idx_posts_author ON public.posts(user_id, created_at DESC);
CREATE INDEX idx_posts_destination ON public.posts(destination_id) WHERE destination_id IS NOT NULL;
CREATE INDEX idx_comments_post ON public.comments(post_id, created_at, id);
CREATE INDEX idx_comments_author ON public.comments(user_id);
CREATE INDEX idx_checkins_trip_time ON public.checkins(trip_id, checked_in_at DESC, id DESC);
CREATE INDEX idx_checkins_user ON public.checkins(user_id);
CREATE INDEX idx_checkins_itinerary ON public.checkins(itinerary_item_id)
    WHERE itinerary_item_id IS NOT NULL;
CREATE INDEX idx_location_shares_user ON public.location_shares(user_id);
CREATE INDEX idx_location_shares_expiry ON public.location_shares(expires_at) WHERE enabled;
CREATE INDEX idx_meetup_points_trip ON public.meetup_points(trip_id, target_time, id);
CREATE INDEX idx_meetup_points_creator ON public.meetup_points(created_by);
