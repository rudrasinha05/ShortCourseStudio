CREATE TABLE `course_banners` (
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`faculty` text DEFAULT '' NOT NULL,
	`qualification` text DEFAULT '' NOT NULL,
	`profile` text DEFAULT '' NOT NULL,
	`photo` text DEFAULT '' NOT NULL,
	`starts_at` text DEFAULT '' NOT NULL,
	`timing` text DEFAULT '' NOT NULL,
	`visible` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`slug`, `batch`)
);
