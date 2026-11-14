CREATE TABLE `batch_learning_material` (
	`slug` text NOT NULL,
	`batch` text NOT NULL,
	`day` integer NOT NULL,
	`resource_title` text DEFAULT '' NOT NULL,
	`resource_url` text DEFAULT '' NOT NULL,
	`assignment_title` text DEFAULT '' NOT NULL,
	`assignment_url` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`slug`, `batch`, `day`)
);
