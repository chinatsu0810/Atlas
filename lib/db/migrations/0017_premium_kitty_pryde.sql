CREATE TABLE "threads_kpi_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"metrics" jsonb NOT NULL,
	"context" text DEFAULT '' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"review" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "threads_kpi_reports" ADD CONSTRAINT "threads_kpi_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;