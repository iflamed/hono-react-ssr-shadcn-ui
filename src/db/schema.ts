import env from '@/config/env';
import { int, bigint, mysqlTableCreator, text, varchar, uniqueIndex } from 'drizzle-orm/mysql-core';

const mysqlTable = mysqlTableCreator((name) => `${env.DATABASE_TABLE_PREFIX}_${name}`);

export const blog = mysqlTable('blogs', {
  id: int().autoincrement().primaryKey(),
  slug: varchar({ length: 191 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  desc: varchar({ length: 255 }).notNull(),
  banner: varchar({ length: 255 }).notNull(),
  markdown: text(),
  lang: varchar({ length: 255 }).notNull(),
  ts: bigint({ mode: 'number', unsigned: true }).notNull(),
}, (table) => [
    uniqueIndex("slug_idx").on(table.slug)
]);
