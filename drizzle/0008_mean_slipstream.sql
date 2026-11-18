ALTER TABLE `applications` ADD `form_answers` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `batch_rules` ADD `fee_paise` integer;--> statement-breakpoint
ALTER TABLE `batch_rules` ADD `form_fields` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `batch_rules` ADD `form_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE course_settings
SET status = 'open'
WHERE slug = 'c-by-horesh-sir'
  AND batch = 'batch-1'
  AND status = 'closed'
  AND schedule = 'Starts 26 November 2026 at 8:00 PM IST'
  AND mode = 'Online';
