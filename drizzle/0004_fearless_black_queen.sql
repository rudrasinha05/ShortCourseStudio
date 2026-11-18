CREATE TABLE `faculty_assignments` (
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`faculty_id` text NOT NULL,
	`earned` integer DEFAULT 0 NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`slug`, `batch`),
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `faculty_assignments_owner` ON `faculty_assignments` (`faculty_id`);--> statement-breakpoint
CREATE TABLE `faculty_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`department` text NOT NULL,
	`designation` text NOT NULL,
	`qualification` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `faculty_profiles_email_unique` ON `faculty_profiles` (`email`);--> statement-breakpoint
CREATE TABLE `faculty_progress` (
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`day` integer NOT NULL,
	`completed_at` text NOT NULL,
	PRIMARY KEY(`slug`, `batch`, `day`)
);
--> statement-breakpoint
CREATE TABLE `faculty_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`faculty_id` text NOT NULL,
	`title` text NOT NULL,
	`track` text NOT NULL,
	`format` text NOT NULL,
	`summary` text NOT NULL,
	`outcome` text NOT NULL,
	`level` text NOT NULL,
	`tools` text NOT NULL,
	`syllabus_url` text DEFAULT '' NOT NULL,
	`days` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `faculty_proposals_owner` ON `faculty_proposals` (`faculty_id`);--> statement-breakpoint
ALTER TABLE `applications` ADD `student_user_id` text;--> statement-breakpoint
CREATE INDEX `applications_student_user` ON `applications` (`student_user_id`);