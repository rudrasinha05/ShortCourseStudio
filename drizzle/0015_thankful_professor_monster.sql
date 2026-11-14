CREATE TABLE `application_billing` (
	`application_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address_line` text NOT NULL,
	`address_extra` text DEFAULT '' NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`pin` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
