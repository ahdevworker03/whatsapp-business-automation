import { Pool } from "pg";
import { env } from "../config/env";

// Dedicated pg.Pool for connect-pg-simple (docs/development-milestones/08.5-authentication.md
// section 5). Separate from Prisma's own adapter-pg pool (prisma/client.ts) —
// connect-pg-simple needs a plain `pg.Pool`, not a Prisma client.
export const pgPool = new Pool({ connectionString: env.databaseUrl });
