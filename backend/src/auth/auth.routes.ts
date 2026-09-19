import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import * as authController from "./auth.controller";

// Mounted at /api/v1/auth, ahead of requireSession in v1.routes.ts — login
// must be reachable without an existing session, and logout must be
// reachable to clear one even if it's already invalid.
export const authRouter = Router();

authRouter.post("/login", asyncHandler(authController.login));
authRouter.post("/logout", asyncHandler(authController.logout));

// Also mounted at /api/v1/auth, but *after* requireSession in v1.routes.ts —
// unlike login/logout, this one must be gated like every other /api/v1/*
// route, not special-cased.
export const authProtectedRouter = Router();

authProtectedRouter.get("/me", authController.me);
