CREATE TABLE "management_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"stage" varchar(30) DEFAULT 'framing' NOT NULL,
	"owner_decision" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "meeting_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"author_type" varchar(20) NOT NULL,
	"employee_id" varchar(50),
	"stage" varchar(30) NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_workflows" ADD COLUMN "post_plan" jsonb;--> statement-breakpoint
ALTER TABLE "management_meetings" ADD CONSTRAINT "management_meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_messages" ADD CONSTRAINT "meeting_messages_meeting_id_management_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."management_meetings"("id") ON DELETE cascade ON UPDATE no action;