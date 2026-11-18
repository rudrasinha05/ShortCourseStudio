CREATE TABLE `faculty_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`password` text,
	`verified_at` integer,
	`provider` text,
	`subject` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `faculty_accounts_username_unique` ON `faculty_accounts` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `faculty_accounts_email_unique` ON `faculty_accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `faculty_oauth_identity` ON `faculty_accounts` (`provider`,`subject`);--> statement-breakpoint
CREATE TABLE `faculty_oauth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`verifier` text NOT NULL,
	`return_view` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `faculty_oauth_attempt_expiry` ON `faculty_oauth_attempts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `faculty_auth_rate` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`hits` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `faculty_rate_window` ON `faculty_auth_rate` (`window`);--> statement-breakpoint
CREATE TABLE `faculty_auth_sessions` (
	`key` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `faculty_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `faculty_session_expiry` ON `faculty_auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `faculty_email_verifications` (
	`key` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `faculty_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `faculty_email_verifications_account_id_unique` ON `faculty_email_verifications` (`account_id`);--> statement-breakpoint
CREATE INDEX `faculty_verification_expiry` ON `faculty_email_verifications` (`expires_at`);