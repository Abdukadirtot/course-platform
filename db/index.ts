import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "@/lib/env";
import * as schema from "./schema";

// WebSocket pool (not neon-http) because webhook processing and reordering
// need interactive transactions.
function createDb() {
  return drizzle({ client: new Pool({ connectionString: env().DATABASE_URL }), schema });
}

let instance: ReturnType<typeof createDb> | undefined;

export function db() {
  instance ??= createDb();
  return instance;
}
