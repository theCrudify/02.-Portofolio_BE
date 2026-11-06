-- Work experiences: attachments (photos, documents) and links (same shape as certificates).
CREATE TABLE "experience_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"experience_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "experience_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"experience_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"caption_en" varchar(200),
	"caption_id" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "experience_links" ADD CONSTRAINT "experience_links_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_links" ADD CONSTRAINT "experience_links_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_media" ADD CONSTRAINT "experience_media_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_media" ADD CONSTRAINT "experience_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "experience_links_parent_idx" ON "experience_links" USING btree ("experience_id");
--> statement-breakpoint
CREATE INDEX "experience_media_parent_idx" ON "experience_media" USING btree ("experience_id");
--> statement-breakpoint
CREATE INDEX "experience_media_media_idx" ON "experience_media" USING btree ("media_id");
