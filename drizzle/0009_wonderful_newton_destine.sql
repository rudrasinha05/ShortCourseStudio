CREATE TABLE `faculty_payout_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`faculty_id` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`earned_before` integer NOT NULL,
	`earned_after` integer NOT NULL,
	`paid_before` integer NOT NULL,
	`paid_after` integer NOT NULL,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faculty_proposal_review` (
	`proposal_id` text PRIMARY KEY NOT NULL,
	`note` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `faculty_proposals`(`id`) ON UPDATE no action ON DELETE no action
);
