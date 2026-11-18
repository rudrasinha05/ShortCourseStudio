CREATE TABLE `batch_archive` (
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`schedule` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`slug`, `batch`)
);
--> statement-breakpoint
CREATE TABLE `course_catalogue` (
	`slug` text PRIMARY KEY NOT NULL,
	`visibility` text DEFAULT 'published' NOT NULL,
	`definition` text
);
