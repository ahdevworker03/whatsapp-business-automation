import { Router } from "express";
import { sessionMiddleware } from "../middleware/session";
import { requireSession } from "../middleware/sessionAuth";
import { authRouter, authProtectedRouter } from "../auth/auth.routes";
import { leadsRouter } from "../leads/leads.routes";
import { campaignRouter } from "../campaigns/campaign.routes";
import { messagesRouter } from "../messages/messages.routes";
import { inboxRouter } from "../inbox/inbox.routes";
import { dashboardRouter } from "../dashboard/dashboard.routes";
import { settingsRouter } from "../settings/settings.routes";

// Router for /api/v1/*. Every route requires a valid session per
// docs/architecture/05-api-design.md section 11 (replaces the old static
// bearer token) — except /auth/login and /auth/logout, mounted ahead of
// requireSession since login must be reachable without an existing session.
export const v1Router = Router();

v1Router.use(sessionMiddleware);
v1Router.use("/auth", authRouter);
v1Router.use(requireSession);
v1Router.use("/auth", authProtectedRouter);

v1Router.use("/leads", leadsRouter);
v1Router.use("/campaign", campaignRouter);
v1Router.use("/messages", messagesRouter);
v1Router.use("/inbox", inboxRouter);
v1Router.use("/dashboard", dashboardRouter);
v1Router.use("/settings", settingsRouter);
