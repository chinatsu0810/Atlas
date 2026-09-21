CREATE TABLE "account_deletions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mode" varchar(20) NOT NULL,
	"actor_type" varchar(10) NOT NULL,
	"actor_id" integer,
	"reason" text,
	"email_hash" varchar(64),
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"purge_after" timestamp NOT NULL,
	"purged_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "account_deletions_pending_idx" ON "account_deletions" USING btree ("purge_after") WHERE "account_deletions"."purged_at" IS NULL;