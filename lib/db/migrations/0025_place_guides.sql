CREATE TABLE "place_guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_slug" varchar(50) NOT NULL,
	"region_slug" varchar(50) NOT NULL,
	"theme_key" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'planning' NOT NULL,
	"running_since" timestamp,
	"error" text,
	"plan" jsonb,
	"research" jsonb,
	"fact_check" jsonb,
	"review" jsonb,
	"review_rounds" integer DEFAULT 0 NOT NULL,
	"chairman_note" text,
	"chairman_feedback" text,
	"draft" jsonb,
	"published_content" jsonb,
	"created_by" integer,
	"published_by" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "place_guides" ADD CONSTRAINT "place_guides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_guides" ADD CONSTRAINT "place_guides_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "place_guides_target_idx" ON "place_guides" USING btree ("country_slug","region_slug","theme_key");