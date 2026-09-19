import "express-session";

// Single shared-credential auth (docs/architecture/05-api-design.md section 11) —
// no user table, so the only session data needed is a boolean flag.
declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
  }
}
