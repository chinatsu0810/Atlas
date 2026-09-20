CREATE TABLE "social_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" varchar(20) DEFAULT 'threads' NOT NULL,
	"topic" varchar(200) NOT NULL,
	"audience" varchar(200) NOT NULL,
	"tone" varchar(20) NOT NULL,
	"promote_atlas" boolean DEFAULT true NOT NULL,
	"research_result" jsonb,
	"draft" text DEFAULT '' NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audit_result" jsonb,
	"status" varchar(20) DEFAULT 'researching' NOT NULL,
	"created_by" integer NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"posted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_workflows" ADD CONSTRAINT "social_workflows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_workflows" ADD CONSTRAINT "social_workflows_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;