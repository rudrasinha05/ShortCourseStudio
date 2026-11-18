CREATE TABLE `student_google_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`verifier` text NOT NULL,
	`nonce` text NOT NULL,
	`return_to` text NOT NULL,
	`link_student_id` text,
	`link_session` text,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `student_google_expiry` ON `student_google_attempts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `student_google_identities` (
	`subject` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `student_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_google_identities_student_id_unique` ON `student_google_identities` (`student_id`);