ALTER TABLE events RENAME TO events_legacy;
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  occurred_at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('party_created','participant_joined','party_size','chat_sent','play','pause','seek','video_changed','invite_opened','permission_granted','permission_denied','permission_required','join_attempt','video_ready','video_missing','connection_recovered','sync_attempt','sync_result')),
  party_key TEXT NOT NULL,
  site TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 0),
  browser TEXT NOT NULL DEFAULT 'unknown',
  version TEXT NOT NULL DEFAULT 'unknown',
  source TEXT NOT NULL DEFAULT 'production' CHECK (source IN ('production','test')),
  outcome TEXT NOT NULL DEFAULT '',
  command_id TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 0
);
INSERT INTO events (id,occurred_at,kind,party_key,site,value)
  SELECT id,occurred_at,kind,party_key,site,value FROM events_legacy ORDER BY rowid;
DROP TABLE events_legacy;
CREATE INDEX events_occurred_at ON events(occurred_at);
CREATE INDEX events_party_time ON events(party_key, occurred_at);
CREATE TABLE party_presence (
  party_key TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  peers INTEGER NOT NULL,
  observed_at INTEGER NOT NULL
);
CREATE INDEX events_command ON events(command_id) WHERE command_id != '';
