CREATE TABLE `portal_sessions` (
	`key` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`account` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `portal_session_expiry` ON `portal_sessions` (`expires_at`);