-- Education: attachments (diploma, transcript, photos) and links (same shape as work experiences).
CREATE TABLE "education_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"education_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "education_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"education_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"caption_en" varchar(200),
	"caption_id" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "education_links" ADD CONSTRAINT "education_links_education_id_education_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "education_links" ADD CONSTRAINT "education_links_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "education_media" ADD CONSTRAINT "education_media_education_id_education_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "education_media" ADD CONSTRAINT "education_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "education_links_parent_idx" ON "education_links" USING btree ("education_id");
--> statement-breakpoint
CREATE INDEX "education_media_parent_idx" ON "education_media" USING btree ("education_id");
--> statement-breakpoint
CREATE INDEX "education_media_media_idx" ON "education_media" USING btree ("media_id");
