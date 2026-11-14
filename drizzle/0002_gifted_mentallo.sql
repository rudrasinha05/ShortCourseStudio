CREATE TABLE `class_sessions` (
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`day` integer NOT NULL,
	`starts_at` text DEFAULT '' NOT NULL,
	`ends_at` text DEFAULT '' NOT NULL,
	`live_url` text DEFAULT '' NOT NULL,
	`replay_url` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`slug`, `batch`, `day`)
);
--> statement-breakpoint
ALTER TABLE `applications` ADD `class_access` integer DEFAULT 0 NOT NULL;