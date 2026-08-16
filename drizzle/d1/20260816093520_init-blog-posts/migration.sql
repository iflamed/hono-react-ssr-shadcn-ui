CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`banner` text NOT NULL,
	`markdown` text NOT NULL,
	`lang` text DEFAULT 'en' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_idx` ON `posts` (`slug`);