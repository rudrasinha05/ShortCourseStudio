CREATE TABLE `owner_admin_credentials` (
	`email` text PRIMARY KEY NOT NULL,
	`password` text,
	`google_subject` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owner_admin_google_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`verifier` text NOT NULL,
	`nonce` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `owner_admin_google_attempt_expiry` ON `owner_admin_google_attempts` (`expires_at`);