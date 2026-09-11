CREATE TABLE events (
  id TEXT PRIMARY KEY,
  occurred_at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('party_created', 'participant_joined', 'party_size', 'chat_sent', 'play', 'pause', 'seek', 'video_changed')),
  party_key TEXT NOT NULL,
  site TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 0)
);
CREATE INDEX events_occurred_at ON events(occurred_at);
