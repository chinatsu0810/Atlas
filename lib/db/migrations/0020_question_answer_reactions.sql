CREATE TABLE "answer_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"visitor_id" uuid NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"visitor_id" uuid NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer_reactions" ADD CONSTRAINT "answer_reactions_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reactions" ADD CONSTRAINT "question_reactions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "answer_reactions_answer_visitor_type_unique" ON "answer_reactions" USING btree ("answer_id","visitor_id","reaction_type");--> statement-breakpoint
CREATE UNIQUE INDEX "question_reactions_question_visitor_type_unique" ON "question_reactions" USING btree ("question_id","visitor_id","reaction_type");