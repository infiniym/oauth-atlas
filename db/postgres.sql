CREATE TABLE IF NOT EXISTS guides (id text PRIMARY KEY, payload text NOT NULL, created_at text NOT NULL);
CREATE TABLE IF NOT EXISTS research_limits (bucket text PRIMARY KEY, count integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS live_guide_limits (bucket text PRIMARY KEY, count integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS live_guides (id text PRIMARY KEY, payload text NOT NULL, created_at text NOT NULL);
CREATE TABLE IF NOT EXISTS launch_plans (id text PRIMARY KEY, payload text NOT NULL, created_at text NOT NULL);
CREATE TABLE IF NOT EXISTS guide_jobs (
  id text PRIMARY KEY,
  request_key text NOT NULL UNIQUE,
  payload text NOT NULL,
  state text NOT NULL,
  lease text,
  lease_until bigint NOT NULL DEFAULT 0,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
