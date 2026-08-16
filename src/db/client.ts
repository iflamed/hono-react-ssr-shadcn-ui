import { drizzle } from "drizzle-orm/d1";

export const createDatabase = (binding: D1Database) => drizzle(binding);
