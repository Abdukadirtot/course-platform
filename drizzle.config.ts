import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  // Neon Auth owns the `neon_auth` schema; never let migrations touch it.
  schemaFilter: ["public"],
  dbCredentials: { url: process.env.DATABASE_URL! },
});
