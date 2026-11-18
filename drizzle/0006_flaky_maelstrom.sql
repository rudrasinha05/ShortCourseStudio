CREATE TABLE `admin_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created_at` text NOT NULL,
	`previous` text,
	`next` text
);
--> statement-breakpoint
CREATE TABLE `admin_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `applicant_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` text NOT NULL,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `applicant_notes_application` ON `applicant_notes` (`application_id`);--> statement-breakpoint
CREATE TABLE `batch_rules` (
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`application_limit` integer DEFAULT 0 NOT NULL,
	`closes_at` text DEFAULT '' NOT NULL,
	`payment_paused` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`slug`, `batch`)
);
--> statement-breakpoint
CREATE TABLE `learning_records` (
	`application_id` text PRIMARY KEY NOT NULL,
	`attendance` text DEFAULT '[]' NOT NULL,
	`score` integer,
	`result` text DEFAULT 'pending' NOT NULL,
	`certificate_id` text,
	`issued_at` text,
	`issued_name` text,
	`issued_course` text,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_records_certificate_id_unique` ON `learning_records` (`certificate_id`);