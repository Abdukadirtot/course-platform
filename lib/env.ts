import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.url(),
  NEON_AUTH_BASE_URL: z.url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  POLAR_ACCESS_TOKEN: z.string().min(1),
  POLAR_WEBHOOK_SECRET: z.string().min(1),
  POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
  POLAR_MONTHLY_PRODUCT_ID: z.string().min(1),
  POLAR_LIFETIME_PRODUCT_ID: z.string().min(1),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1),
  NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: z.string().min(1),
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: z.url(),
  MAX_VIDEO_UPLOAD_MB: z.coerce.number().int().positive().default(2048),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

// Parsed lazily so `next build` and unit tests don't require every secret,
// but the first request that needs config fails loudly with every missing key listed.
export function env(): ServerEnv {
  if (cached) return cached;
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = result.data;
  return cached;
}
