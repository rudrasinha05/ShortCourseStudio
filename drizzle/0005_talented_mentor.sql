CREATE TABLE `site_controls` (
	`id` integer PRIMARY KEY NOT NULL,
	`intake_paused` integer DEFAULT 0 NOT NULL,
	`announcement` text DEFAULT '' NOT NULL
);
