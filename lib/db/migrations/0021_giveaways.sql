CREATE TABLE "giveaway_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"giveaway_id" integer NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaway_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"sender_id" integer,
	"kind" varchar(10) DEFAULT 'user' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaway_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"giveaway_id" integer NOT NULL,
	"message_id" integer,
	"reporter_id" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaway_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"giveaway_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"owner_last_read_at" timestamp,
	"applicant_last_read_at" timestamp,
	"owner_notified_at" timestamp,
	"applicant_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaways" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(20) NOT NULL,
	"country" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"area" varchar(100),
	"price_amount" integer,
	"currency" varchar(3),
	"available_until" date,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"recipient_id" integer,
	"expires_at" timestamp NOT NULL,
	"handed_over_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "giveaway_images" ADD CONSTRAINT "giveaway_images_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_messages" ADD CONSTRAINT "giveaway_messages_thread_id_giveaway_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."giveaway_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_messages" ADD CONSTRAINT "giveaway_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_reports" ADD CONSTRAINT "giveaway_reports_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_reports" ADD CONSTRAINT "giveaway_reports_message_id_giveaway_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."giveaway_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_reports" ADD CONSTRAINT "giveaway_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_threads" ADD CONSTRAINT "giveaway_threads_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_threads" ADD CONSTRAINT "giveaway_threads_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "giveaway_images_giveaway_idx" ON "giveaway_images" USING btree ("giveaway_id");--> statement-breakpoint
CREATE INDEX "giveaway_messages_thread_idx" ON "giveaway_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "giveaway_threads_giveaway_applicant_unique" ON "giveaway_threads" USING btree ("giveaway_id","applicant_id");--> statement-breakpoint
CREATE INDEX "giveaway_threads_applicant_idx" ON "giveaway_threads" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "giveaways_status_idx" ON "giveaways" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "giveaways_author_idx" ON "giveaways" USING btree ("author_id");