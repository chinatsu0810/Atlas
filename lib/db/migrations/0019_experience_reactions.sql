CREATE TABLE "experience_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" integer NOT NULL,
	"visitor_id" uuid NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experience_reactions" ADD CONSTRAINT "experience_reactions_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "experience_reactions_experience_visitor_type_unique" ON "experience_reactions" USING btree ("experience_id","visitor_id","reaction_type");