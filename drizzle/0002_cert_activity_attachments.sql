-- Certificates and activities: long description, attachments (images/PDF), links, tools/skills, achievements.
CREATE TABLE "activity_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"activity_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "activity_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"activity_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"caption_en" varchar(200),
	"caption_id" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TABLE "activity_technologies" (
	"activity_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "activity_technologies_activity_id_technology_id_pk" PRIMARY KEY("activity_id","technology_id")
);

--> statement-breakpoint
CREATE TABLE "certification_achievements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"certification_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "certification_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"certification_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "certification_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"certification_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"caption_en" varchar(200),
	"caption_id" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TABLE "certification_technologies" (
	"certification_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "certification_technologies_certification_id_technology_id_pk" PRIMARY KEY("certification_id","technology_id")
);

--> statement-breakpoint
ALTER TABLE "certifications" ADD COLUMN "description_en" text;
--> statement-breakpoint
ALTER TABLE "certifications" ADD COLUMN "description_id" text;
--> statement-breakpoint
ALTER TABLE "activity_links" ADD CONSTRAINT "activity_links_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_links" ADD CONSTRAINT "activity_links_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_media" ADD CONSTRAINT "activity_media_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_media" ADD CONSTRAINT "activity_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_technologies" ADD CONSTRAINT "activity_technologies_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_technologies" ADD CONSTRAINT "activity_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certification_achievements" ADD CONSTRAINT "certification_achievements_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certification_links" ADD CONSTRAINT "certification_links_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certification_links" ADD CONSTRAINT "certification_links_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certification_media" ADD CONSTRAINT "certification_media_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certification_media" ADD CONSTRAINT "certification_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certification_technologies" ADD CONSTRAINT "certification_technologies_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certification_technologies" ADD CONSTRAINT "certification_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_links_parent_idx" ON "activity_links" USING btree ("activity_id");
--> statement-breakpoint
CREATE INDEX "activity_media_parent_idx" ON "activity_media" USING btree ("activity_id");
--> statement-breakpoint
CREATE INDEX "activity_media_media_idx" ON "activity_media" USING btree ("media_id");
--> statement-breakpoint
CREATE INDEX "activity_technologies_tech_idx" ON "activity_technologies" USING btree ("technology_id");
--> statement-breakpoint
CREATE INDEX "certification_achievements_cert_idx" ON "certification_achievements" USING btree ("certification_id","sort_order");
--> statement-breakpoint
CREATE INDEX "certification_links_parent_idx" ON "certification_links" USING btree ("certification_id");
--> statement-breakpoint
CREATE INDEX "certification_media_parent_idx" ON "certification_media" USING btree ("certification_id");
--> statement-breakpoint
CREATE INDEX "certification_media_media_idx" ON "certification_media" USING btree ("media_id");
--> statement-breakpoint
CREATE INDEX "certification_technologies_tech_idx" ON "certification_technologies" USING btree ("technology_id");
