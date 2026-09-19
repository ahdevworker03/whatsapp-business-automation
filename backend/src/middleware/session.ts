import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pgPool } from "../lib/pgPool";
import { env } from "../config/env";

const PgSession = connectPgSimple(session);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Server-side session middleware for /api/v1/* per
// docs/development-milestones/08.5-authentication.md section 5 — replaces
// the old static API_ACCESS_TOKEN. Store is Postgres-backed (not in-memory)
// so sessions survive a systemd restart (docs/architecture/06-deployment.md
// section 5's Restart=on-failure). Table is auto-created on first run.
export const sessionMiddleware = session({
  store: new PgSession({
    pool: pgPool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: true,
    maxAge: THIRTY_DAYS_MS,
  },
});
