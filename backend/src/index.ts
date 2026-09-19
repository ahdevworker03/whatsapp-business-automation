import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { v1Router } from "./routes/v1.routes";
import { whatsappWebhookRouter } from "./webhooks/whatsapp.routes";
import { startFollowupScheduler } from "./jobs/followupScheduler";

const app = express();

// Behind Nginx per docs/architecture/06-deployment.md section 3 — needed so
// Express/express-session see the original request scheme correctly.
app.set("trust proxy", 1);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/webhook", whatsappWebhookRouter);
app.use("/api/v1", v1Router);

app.use(errorHandler);

app.listen(env.port, "127.0.0.1", () => {
  console.log(`Backend listening on 127.0.0.1:${env.port} (${env.nodeEnv})`);
});

startFollowupScheduler();
