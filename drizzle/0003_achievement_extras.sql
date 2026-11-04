-- Achievements: highlights, attachments, links and tools/skills (same shape as certificates).
CREATE TABLE "achievement_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"achievement_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "achievement_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"achievement_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"caption_en" varchar(200),
	"caption_id" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TABLE "achievement_points" (
	"id" uuid PRIMARY KEY NOT NULL,
	"achievement_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "achievement_technologies" (
	"achievement_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "achievement_technologies_achievement_id_technology_id_pk" PRIMARY KEY("achievement_id","technology_id")
);

--> statement-breakpoint
ALTER TABLE "achievement_links" ADD CONSTRAINT "achievement_links_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "achievement_links" ADD CONSTRAINT "achievement_links_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "achievement_media" ADD CONSTRAINT "achievement_media_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "achievement_media" ADD CONSTRAINT "achievement_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "achievement_points" ADD CONSTRAINT "achievement_points_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "achievement_technologies" ADD CONSTRAINT "achievement_technologies_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "achievement_technologies" ADD CONSTRAINT "achievement_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "achievement_links_parent_idx" ON "achievement_links" USING btree ("achievement_id");
--> statement-breakpoint
CREATE INDEX "achievement_media_parent_idx" ON "achievement_media" USING btree ("achievement_id");
--> statement-breakpoint
CREATE INDEX "achievement_media_media_idx" ON "achievement_media" USING btree ("media_id");
--> statement-breakpoint
CREATE INDEX "achievement_points_ach_idx" ON "achievement_points" USING btree ("achievement_id","sort_order");
--> statement-breakpoint
CREATE INDEX "achievement_technologies_tech_idx" ON "achievement_technologies" USING btree ("technology_id");
