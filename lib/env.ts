import { z } from "zod";

const envSchema = z.object({
  DATABASE_PATH: z.string().min(1).default("./data/leaderboard.sqlite"),
  TRUSTMRR_BASE_URL: z.string().url().default("https://trustmrr.com/api/v1"),
  TRUSTMRR_API_KEY: z.string().min(1).optional(),
  HTTPS_PROXY: z.string().min(1).optional(),
  ALL_PROXY: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

export function getTrustMrrApiKey(source: NodeJS.ProcessEnv = process.env) {
  const apiKey = getEnv(source).TRUSTMRR_API_KEY;

  if (!apiKey) {
    throw new Error("TRUSTMRR_API_KEY is required for TrustMRR requests");
  }

  return apiKey;
}

export function getTrustMrrProxyUrl(source: NodeJS.ProcessEnv = process.env) {
  const env = getEnv(source);

  return env.HTTPS_PROXY ?? env.ALL_PROXY;
}
