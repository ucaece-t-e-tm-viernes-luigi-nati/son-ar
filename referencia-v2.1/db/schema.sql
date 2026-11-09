-- SonAR · PostgreSQL schema (target: Neon). Apply when the database integration is connected.

CREATE TYPE account_kind AS ENUM ('musician', 'band', 'venue');
CREATE TYPE account_status AS ENUM ('active', 'paused');
CREATE TYPE platform_role AS ENUM ('user', 'business', 'superadmin');

CREATE TABLE profiles (
  id            TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  kind          account_kind NOT NULL,
  role          platform_role NOT NULL DEFAULT 'user',
  name          TEXT NOT NULL,
  handle        TEXT NOT NULL UNIQUE,
  avatar        TEXT,
  city          TEXT NOT NULL,
  neighborhood  TEXT,
  genres        TEXT[] NOT NULL DEFAULT '{}',
  instruments   TEXT[] NOT NULL DEFAULT '{}',
  looking_for   TEXT[] NOT NULL DEFAULT '{}',
  bio           TEXT NOT NULL DEFAULT '',
  members       INT,
  capacity      INT,
  venue_type    TEXT,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  status        account_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_kind_status_idx ON profiles (kind, status);
CREATE INDEX profiles_genres_idx ON profiles USING GIN (genres);

CREATE TABLE posts (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL,
  content     TEXT NOT NULL CHECK (char_length(content) <= 500),
  image       TEXT,
  tag         TEXT NOT NULL CHECK (tag IN ('busqueda', 'show', 'novedad')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX posts_author_idx ON posts (author_id, created_at DESC);

CREATE TABLE gigs (
  id           TEXT PRIMARY KEY,
  venue_id     TEXT NOT NULL,
  title        TEXT NOT NULL,
  date         DATE NOT NULL,
  genres       TEXT[] NOT NULL DEFAULT '{}',
  fee          INT NOT NULL CHECK (fee >= 0),
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gig_applications (
  gig_id      TEXT NOT NULL,
  profile_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (gig_id, profile_id)
);

CREATE TABLE connections (
  id          TEXT PRIMARY KEY,
  from_id     TEXT NOT NULL,
  to_id       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id)
);

-- Raw activity log powering the super admin daily/monthly dashboards.
CREATE TABLE activity_events (
  id          BIGSERIAL PRIMARY KEY,
  profile_id  TEXT,
  type        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_events_type_time_idx ON activity_events (type, created_at);

CREATE TABLE account_status_audit (
  id          BIGSERIAL PRIMARY KEY,
  profile_id  TEXT NOT NULL,
  status      account_status NOT NULL,
  changed_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
