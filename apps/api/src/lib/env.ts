function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  GITHUB_CLIENT_ID: requireEnv("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: requireEnv("GITHUB_CLIENT_SECRET"),
  GOOGLE_CLIENT_ID: requireEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requireEnv("GOOGLE_CLIENT_SECRET"),
  MICROSOFT_CLIENT_ID: requireEnv("MICROSOFT_CLIENT_ID"),
  MICROSOFT_CLIENT_SECRET: requireEnv("MICROSOFT_CLIENT_SECRET"),
  RESEND_API_KEY: requireEnv("RESEND_API_KEY"),
  BETTER_AUTH_SECRET: requireEnv("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  API_URL: process.env.API_URL ?? "http://localhost:3001",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
