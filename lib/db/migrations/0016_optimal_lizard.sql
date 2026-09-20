CREATE TABLE "threads_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"connected_by" integer NOT NULL,
	"threads_user_id" varchar(64) NOT NULL,
	"username" varchar(100),
	"access_token_encrypted" text NOT NULL,
	"token_refreshed_at" timestamp DEFAULT now() NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "threads_connections" ADD CONSTRAINT "threads_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "threads_connections_threads_user_id_unique" ON "threads_connections" USING btree ("threads_user_id");