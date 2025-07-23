CREATE TABLE IF NOT EXISTS "Log" (
  id           SERIAL PRIMARY KEY,
  method       TEXT    NOT NULL,
  url          TEXT    NOT NULL,
  status       INTEGER NOT NULL,
  responsetime DOUBLE PRECISION NOT NULL,
  ip           TEXT    NOT NULL,
  useragent    TEXT    NOT NULL,
  machinename  TEXT    NOT NULL,
  macaddress   TEXT    NOT NULL,
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  createdat    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
