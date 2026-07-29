import env from "@/config/env";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: env.DATABASE_HOST,
  port: parseInt(env.DATABASE_PORT),
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
});

const db = drizzle({ client: connection });

export default db
