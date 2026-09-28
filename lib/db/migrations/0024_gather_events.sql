CREATE TABLE "gather_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"event_date" date NOT NULL,
	"start_time" varchar(50),
	"country" varchar(100) NOT NULL,
	"region" varchar(100),
	"is_online" boolean DEFAULT false NOT NULL,
	"venue" varchar(200),
	"themes" text[] DEFAULT '{}'::text[] NOT NULL,
	"format" varchar(20) NOT NULL,
	"fee" varchar(100),
	"audience" varchar(200),
	"organizer_name" varchar(100) NOT NULL,
	"organizer_url" text,
	"apply_url" text,
	"source" varchar(20) DEFAULT 'request' NOT NULL,
	"created_by" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "gather_events" ADD CONSTRAINT "gather_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gather_events_event_date_idx" ON "gather_events" USING btree ("event_date");