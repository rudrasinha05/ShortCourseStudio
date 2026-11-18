CREATE TABLE `student_wishlist` (
	`student_id` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`student_id`, `slug`)
);
