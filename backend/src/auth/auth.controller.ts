import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { env } from "../config/env";

// Thin, HTTP-focused controller per docs/rules/backend.md. Single shared
// credential pair (ADMIN_EMAIL / ADMIN_PASSWORD_HASH) — no user table, no
// lookup, per docs/development-milestones/08.5-authentication.md section 5.
export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body ?? {};
  const { email, password } = body;

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const emailMatches = email === env.adminEmail;
  const passwordMatches = await bcrypt.compare(password, env.adminPasswordHash);

  // Generic error on either mismatch — do not reveal whether the email or
  // the password was wrong (no user-enumeration hint).
  if (!emailMatches || !passwordMatches) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Regenerate the session on login (not just reuse the pre-login session
  // id) to avoid session fixation.
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });

  req.session.authenticated = true;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  res.status(200).json({ ok: true });
}

// Session-validity probe (docs/development-milestones/08.5-authentication.md).
// Mounted behind requireSession like every other /api/v1/* route — no auth
// logic here, reaching this handler at all already proves the session is
// valid.
export function me(_req: Request, res: Response): void {
  res.status(200).json({ authenticated: true });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });

  res.clearCookie("connect.sid");
  res.status(200).json({ ok: true });
}
