/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * Verifies M8.5's session-based auth (docs/development-milestones/
 * 08.5-authentication.md section 10 "Automated Testing") with real HTTP
 * requests against the real dev database and the real Postgres-backed
 * session store, using the same v1Router wiring as src/index.ts.
 *
 * Simulates being behind Nginx (X-Forwarded-Proto: https) since
 * cookie.secure: true means express-session will not issue the cookie at
 * all over a connection it doesn't consider secure — see this milestone's
 * report for why that's correct, not a bug.
 */
import express from "express";
import { Server } from "http";
import { env } from "../src/config/env";
import { errorHandler } from "../src/middleware/errorHandler";
import { v1Router } from "../src/routes/v1.routes";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function extractCookie(res: Response): string | undefined {
  const raw = res.headers.get("set-cookie");
  if (!raw) return undefined;
  return raw.split(";")[0]; // "connect.sid=..."
}

async function main() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use("/api/v1", v1Router);
  app.use(errorHandler);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as { port: number }).port;
  const base = `http://localhost:${port}/api/v1`;
  const httpsHeader = { "X-Forwarded-Proto": "https" };

  try {
    console.log("1. Login with wrong password -> 401, generic error, no cookie");
    let res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...httpsHeader },
      body: JSON.stringify({ email: env.adminEmail, password: "wrong-password" }),
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
    const wrongPasswordBody = await res.json();
    assert(wrongPasswordBody.error === "Invalid email or password", "expected generic error message");
    assert(!extractCookie(res), "expected no session cookie on failed login");

    console.log("2. Login with wrong email -> 401, same generic error (no enumeration hint)");
    res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...httpsHeader },
      body: JSON.stringify({ email: "not-the-admin@example.com", password: "irrelevant" }),
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
    const wrongEmailBody = await res.json();
    assert(
      wrongEmailBody.error === wrongPasswordBody.error,
      "wrong-email and wrong-password errors must be identical (no enumeration hint)"
    );

    console.log("3. Protected route without any session -> 401");
    res = await fetch(`${base}/leads`, { headers: httpsHeader });
    assert(res.status === 401, `expected 401, got ${res.status}`);

    console.log("4. Protected route with a bogus/invalid session cookie -> 401");
    res = await fetch(`${base}/leads`, {
      headers: { ...httpsHeader, Cookie: "connect.sid=s%3Abogus.invalidsignature" },
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);

    console.log("5. GET /auth/me without any session -> 401 (same as any other /api/v1/* route)");
    res = await fetch(`${base}/auth/me`, { headers: httpsHeader });
    assert(res.status === 401, `expected 401, got ${res.status}`);

    console.log("6. Login with correct credentials -> 200, sets a Secure+HttpOnly cookie");
    res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...httpsHeader },
      body: JSON.stringify({ email: env.adminEmail, password: process.argv[2] }),
    });
    assert(res.status === 200, `expected 200, got ${res.status} (${await res.text()})`);
    const rawSetCookie = res.headers.get("set-cookie") ?? "";
    assert(rawSetCookie.includes("HttpOnly"), "expected HttpOnly flag on session cookie");
    assert(rawSetCookie.includes("Secure"), "expected Secure flag on session cookie");
    const cookie = extractCookie(res);
    assert(cookie, "expected a session cookie on successful login");

    console.log("7. Protected route with the valid session -> 200, same shape as before");
    res = await fetch(`${base}/leads`, { headers: { ...httpsHeader, Cookie: cookie! } });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const leadsBody = await res.json();
    assert(Array.isArray(leadsBody.leads) && typeof leadsBody.total === "number", "expected { leads, total } shape unchanged");

    console.log("8. GET /auth/me with the valid session -> 200 with the expected minimal body");
    res = await fetch(`${base}/auth/me`, { headers: { ...httpsHeader, Cookie: cookie! } });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const meBody = await res.json();
    assert(meBody.authenticated === true, `expected { authenticated: true }, got ${JSON.stringify(meBody)}`);

    console.log("9. Logout -> 200, then the same session id is rejected on /leads and /auth/me");
    res = await fetch(`${base}/auth/logout`, { method: "POST", headers: { ...httpsHeader, Cookie: cookie! } });
    assert(res.status === 200, `expected 200, got ${res.status}`);

    res = await fetch(`${base}/leads`, { headers: { ...httpsHeader, Cookie: cookie! } });
    assert(res.status === 401, `expected 401 after logout, got ${res.status}`);

    res = await fetch(`${base}/auth/me`, { headers: { ...httpsHeader, Cookie: cookie! } });
    assert(res.status === 401, `expected 401 after logout, got ${res.status}`);

    console.log("\nAll auth checks passed.");
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
