ALTER TABLE "tags" DROP CONSTRAINT "tags_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_category_unique" ON "tags" USING btree ("name","category");