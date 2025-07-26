-- Create sessions table for express-session
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

-- Create index on expire column for session cleanup
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);