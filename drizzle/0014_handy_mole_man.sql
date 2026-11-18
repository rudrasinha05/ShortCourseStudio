CREATE TABLE `class_reminder_dispatch` (
	`event_key` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminder_contacts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL
);
