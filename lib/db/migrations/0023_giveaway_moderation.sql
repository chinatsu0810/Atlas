ALTER TABLE "giveaway_messages" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "giveaway_reports" ADD COLUMN "resolved_at" timestamp;