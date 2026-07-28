import * as dotenv from "dotenv";

dotenv.config({
  path: [
    ...new Set([
      `.env.${process.env.SERVER_MODE || "local"}`,
      ".env.local",
      ".env",
    ]),
  ],
  quiet: true,
});

const requireEnvironment = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const env = {
  APP_PORT: process.env.APP_PORT || "3000",
  DATABASE_HOST: requireEnvironment("DATABASE_HOST"),
  DATABASE_PORT: process.env.DATABASE_PORT || "3306",
  DATABASE_USERNAME: requireEnvironment("DATABASE_USERNAME"),
  DATABASE_PASSWORD: requireEnvironment("DATABASE_PASSWORD"),
  DATABASE_NAME: requireEnvironment("DATABASE_NAME"),
  DATABASE_TABLE_PREFIX: requireEnvironment("DATABASE_TABLE_PREFIX"),
  BLOG_USERNAME: requireEnvironment("BLOG_USERNAME"),
  BLOG_PASSWORD: requireEnvironment("BLOG_PASSWORD"),
} as const;

export default env;
