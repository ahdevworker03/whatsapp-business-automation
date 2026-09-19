import { NextFunction, Request, Response } from "express";

// Session gate for /api/v1/* per docs/architecture/05-api-design.md section 11
// and docs/development-milestones/08.5-authentication.md — replaces the old
// static bearer-token check (apiAuth.ts, removed). Same 401 behavior as
// before on a missing/invalid session. Does not apply to /webhook, which is
// secured separately via Meta's own hub.verify_token, and does not apply to
// /api/v1/auth/* (mounted ahead of this middleware in v1.routes.ts).
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.authenticated) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
