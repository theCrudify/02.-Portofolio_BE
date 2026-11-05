-- Replace all pgEnums with lookups, jsonb arrays with child tables, org names with organizations.
-- Old tables are parked in schema "legacy", copied into the new tables, then dropped (one transaction).
CREATE SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.users SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.login_attempts SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.audit_logs SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.media SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.profile SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.site_settings SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.technologies SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.projects SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.project_technologies SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.project_links SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.project_media SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.experiences SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.experience_technologies SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.education SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.certifications SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.activities SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.achievements SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.publications SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.testimonials SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.documents SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.export_presets SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.share_links SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.messages SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.events SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.daily_stats SET SCHEMA legacy;
--> statement-breakpoint
ALTER TABLE public.github_cache SET SCHEMA legacy;
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title_en" varchar(160) NOT NULL,
	"title_id" varchar(160),
	"issuer_organization_id" uuid,
	"event_name" varchar(160),
	"rank" varchar(60),
	"date" date,
	"description_en" text,
	"description_id" text,
	"certificate_media_id" uuid,
	"link_url" text,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_name" varchar(160),
	"role_en" varchar(100) NOT NULL,
	"role_id" varchar(100),
	"start_date" date,
	"end_date" date,
	"description_en" text,
	"description_id" text,
	"media_id" uuid,
	"link_url" text,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_achievements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"activity_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action_id" uuid NOT NULL,
	"resource" varchar(40) NOT NULL,
	"resource_id" varchar(64),
	"summary" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"issuer_organization_id" uuid NOT NULL,
	"issue_date" date,
	"expiry_date" date,
	"credential_id" varchar(120),
	"credential_url" text,
	"image_media_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"date" date NOT NULL,
	"type_id" uuid NOT NULL,
	"path" varchar(300) DEFAULT '' NOT NULL,
	"target" varchar(60) DEFAULT '' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_stats_date_type_id_path_target_pk" PRIMARY KEY("date","type_id","path","target")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"media_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"locale_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"page_count" smallint,
	"is_active" boolean DEFAULT false NOT NULL,
	"notes" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"degree" varchar(100),
	"field_en" varchar(120),
	"field_id" varchar(120),
	"start_date" date,
	"end_date" date,
	"gpa" numeric(4, 2),
	"gpa_scale" numeric(4, 2),
	"description_en" text,
	"description_id" text,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education_activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"education_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type_id" uuid NOT NULL,
	"path" varchar(300) NOT NULL,
	"locale_id" uuid,
	"project_id" uuid,
	"target" varchar(60),
	"share_link_id" uuid,
	"visitor_hash" varchar(64) NOT NULL,
	"country" varchar(2),
	"referrer" varchar(300),
	"utm_source" varchar(60),
	"utm_campaign" varchar(60),
	"device" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_achievements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"experience_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_projects" (
	"experience_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "experience_projects_experience_id_project_id_pk" PRIMARY KEY("experience_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "experience_responsibilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"experience_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_technologies" (
	"experience_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	CONSTRAINT "experience_technologies_experience_id_technology_id_pk" PRIMARY KEY("experience_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_en" varchar(100) NOT NULL,
	"role_id" varchar(100),
	"employment_type_id" uuid NOT NULL,
	"location" varchar(100),
	"work_mode_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date,
	"description_en" text,
	"description_id" text,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_preset_sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"preset_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"item_limit" smallint,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_preset_technologies" (
	"preset_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	CONSTRAINT "export_preset_technologies_preset_id_technology_id_pk" PRIMARY KEY("preset_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "export_presets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(60) NOT NULL,
	"name" varchar(80) NOT NULL,
	"template_id" uuid NOT NULL,
	"locale_id" uuid NOT NULL,
	"featured_only" boolean DEFAULT false NOT NULL,
	"since_years" smallint,
	"is_public" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_cache" (
	"key" varchar(40) PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"email" varchar(254),
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lookup_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(60) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"name_id" varchar(100),
	"description_en" varchar(300),
	"description_id" varchar(300),
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lookups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"code" varchar(60) NOT NULL,
	"label_en" varchar(120) NOT NULL,
	"label_id" varchar(120),
	"icon" varchar(60),
	"color" varchar(40),
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider_id" uuid NOT NULL,
	"kind_id" uuid NOT NULL,
	"public_id" varchar(255),
	"embed_id" varchar(64),
	"url" text NOT NULL,
	"mime" varchar(100),
	"width" integer,
	"height" integer,
	"bytes" integer,
	"duration_sec" integer,
	"thumbnail_url" text,
	"captions_url" text,
	"title_en" varchar(160),
	"title_id" varchar(160),
	"alt_en" varchar(300),
	"alt_id" varchar(300),
	"uploaded_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(254) NOT NULL,
	"subject" varchar(150),
	"body" text NOT NULL,
	"locale_id" uuid NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"type_id" uuid NOT NULL,
	"logo_media_id" uuid,
	"website_url" text,
	"location" varchar(100),
	"description_en" text,
	"description_id" text,
	"is_confidential" boolean DEFAULT false NOT NULL,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" varchar(100) NOT NULL,
	"headline_en" varchar(160) NOT NULL,
	"headline_id" varchar(160),
	"bio_en" text NOT NULL,
	"bio_id" text,
	"avatar_media_id" uuid,
	"location" varchar(100),
	"timezone" varchar(64) DEFAULT 'Asia/Jakarta' NOT NULL,
	"email" varchar(254),
	"availability_id" uuid NOT NULL,
	"work_preference_id" uuid NOT NULL,
	"references_note_en" varchar(300),
	"references_note_id" varchar(300),
	"career_start_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_interests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" smallint DEFAULT 1 NOT NULL,
	"label_en" varchar(80) NOT NULL,
	"label_id" varchar(80),
	"icon" varchar(60),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_languages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" smallint DEFAULT 1 NOT NULL,
	"name_en" varchar(60) NOT NULL,
	"name_id" varchar(60),
	"level_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_socials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" smallint DEFAULT 1 NOT NULL,
	"platform_id" uuid NOT NULL,
	"url" text NOT NULL,
	"handle" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_highlights" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"caption_en" varchar(200),
	"caption_id" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_metrics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"label_en" varchar(120) NOT NULL,
	"label_id" varchar(120),
	"value" varchar(60) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_responsibilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_technologies" (
	"project_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "project_technologies_project_id_technology_id_pk" PRIMARY KEY("project_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"title_en" varchar(120) NOT NULL,
	"title_id" varchar(120),
	"summary_en" varchar(200) NOT NULL,
	"summary_id" varchar(200),
	"type_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"role_en" varchar(120),
	"role_id" varchar(120),
	"team_size" smallint,
	"client_organization_id" uuid,
	"period_start" date,
	"period_end" date,
	"problem_en" text,
	"problem_id" text,
	"solution_en" text,
	"solution_id" text,
	"result_en" text,
	"result_id" text,
	"challenges_en" text,
	"challenges_id" text,
	"cover_media_id" uuid,
	"architecture_media_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"meta_title_en" varchar(70),
	"meta_title_id" varchar(70),
	"meta_description_en" varchar(160),
	"meta_description_id" varchar(160),
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"venue" varchar(160),
	"date" date,
	"summary_en" text,
	"summary_id" text,
	"url" text,
	"video_media_id" uuid,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" varchar(43) NOT NULL,
	"label" varchar(120) NOT NULL,
	"document_id" uuid,
	"preset_id" uuid,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_opened_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_sections" (
	"section_id" uuid PRIMARY KEY NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"theme_preset_id" uuid NOT NULL,
	"color_mode_id" uuid NOT NULL,
	"font_pair_id" uuid NOT NULL,
	"hero_cv_buttons_id" uuid NOT NULL,
	"seo_title_en" varchar(70),
	"seo_title_id" varchar(70),
	"seo_description_en" varchar(160),
	"seo_description_id" varchar(160),
	"og_media_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technologies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(60) NOT NULL,
	"slug" varchar(60) NOT NULL,
	"category_id" uuid NOT NULL,
	"icon" varchar(120),
	"show_on_skills" boolean DEFAULT true NOT NULL,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" varchar(100),
	"organization_id" uuid,
	"avatar_media_id" uuid,
	"relationship" varchar(100),
	"quote_en" text NOT NULL,
	"quote_id" text,
	"linkedin_url" text,
	"status_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"role_id" uuid NOT NULL,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_issuer_organization_id_organizations_id_fk" FOREIGN KEY ("issuer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_certificate_media_id_media_id_fk" FOREIGN KEY ("certificate_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_achievements" ADD CONSTRAINT "activity_achievements_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_action_id_lookups_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_issuer_organization_id_organizations_id_fk" FOREIGN KEY ("issuer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_locale_id_lookups_id_fk" FOREIGN KEY ("locale_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "education_activities" ADD CONSTRAINT "education_activities_education_id_education_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_locale_id_lookups_id_fk" FOREIGN KEY ("locale_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_achievements" ADD CONSTRAINT "experience_achievements_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_projects" ADD CONSTRAINT "experience_projects_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_projects" ADD CONSTRAINT "experience_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_responsibilities" ADD CONSTRAINT "experience_responsibilities_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_employment_type_id_lookups_id_fk" FOREIGN KEY ("employment_type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_work_mode_id_lookups_id_fk" FOREIGN KEY ("work_mode_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "export_preset_sections" ADD CONSTRAINT "export_preset_sections_preset_id_export_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."export_presets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "export_preset_sections" ADD CONSTRAINT "export_preset_sections_section_id_lookups_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "export_preset_technologies" ADD CONSTRAINT "export_preset_technologies_preset_id_export_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."export_presets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "export_preset_technologies" ADD CONSTRAINT "export_preset_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "export_presets" ADD CONSTRAINT "export_presets_template_id_lookups_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "export_presets" ADD CONSTRAINT "export_presets_locale_id_lookups_id_fk" FOREIGN KEY ("locale_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lookups" ADD CONSTRAINT "lookups_group_id_lookup_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."lookup_groups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_provider_id_lookups_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_kind_id_lookups_id_fk" FOREIGN KEY ("kind_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_locale_id_lookups_id_fk" FOREIGN KEY ("locale_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_avatar_media_id_media_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_availability_id_lookups_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_work_preference_id_lookups_id_fk" FOREIGN KEY ("work_preference_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_interests" ADD CONSTRAINT "profile_interests_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_languages" ADD CONSTRAINT "profile_languages_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_languages" ADD CONSTRAINT "profile_languages_level_id_lookups_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_socials" ADD CONSTRAINT "profile_socials_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_socials" ADD CONSTRAINT "profile_socials_platform_id_lookups_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_highlights" ADD CONSTRAINT "project_highlights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_role_id_lookups_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_metrics" ADD CONSTRAINT "project_metrics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_responsibilities" ADD CONSTRAINT "project_responsibilities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_group_id_lookups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_state_id_lookups_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_organization_id_organizations_id_fk" FOREIGN KEY ("client_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_architecture_media_id_media_id_fk" FOREIGN KEY ("architecture_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_type_id_lookups_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_video_media_id_media_id_fk" FOREIGN KEY ("video_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_preset_id_export_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."export_presets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_sections" ADD CONSTRAINT "site_sections_section_id_lookups_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."lookups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_theme_preset_id_lookups_id_fk" FOREIGN KEY ("theme_preset_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_color_mode_id_lookups_id_fk" FOREIGN KEY ("color_mode_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_font_pair_id_lookups_id_fk" FOREIGN KEY ("font_pair_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_cv_buttons_id_lookups_id_fk" FOREIGN KEY ("hero_cv_buttons_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_media_id_media_id_fk" FOREIGN KEY ("og_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "technologies" ADD CONSTRAINT "technologies_category_id_lookups_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "technologies" ADD CONSTRAINT "technologies_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_avatar_media_id_media_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_status_id_lookups_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_lookups_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."lookups"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "achievements_status_idx" ON "achievements" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE INDEX "activities_status_idx" ON "activities" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE INDEX "activity_achievements_act_idx" ON "activity_achievements" USING btree ("activity_id","sort_order");
--> statement-breakpoint
CREATE INDEX "audit_logs_time_idx" ON "audit_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "certifications_status_idx" ON "certifications" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE INDEX "certifications_issuer_idx" ON "certifications" USING btree ("issuer_organization_id");
--> statement-breakpoint
CREATE INDEX "documents_type_locale_idx" ON "documents" USING btree ("type_id","locale_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "documents_one_active_uq" ON "documents" USING btree ("type_id","locale_id") WHERE "documents"."is_active" = true;
--> statement-breakpoint
CREATE INDEX "education_status_idx" ON "education" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE INDEX "education_activities_edu_idx" ON "education_activities" USING btree ("education_id","sort_order");
--> statement-breakpoint
CREATE INDEX "events_time_idx" ON "events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "events_type_time_idx" ON "events" USING btree ("type_id","created_at");
--> statement-breakpoint
CREATE INDEX "events_project_idx" ON "events" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "experience_achievements_exp_idx" ON "experience_achievements" USING btree ("experience_id","sort_order");
--> statement-breakpoint
CREATE INDEX "ep_project_idx" ON "experience_projects" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "experience_responsibilities_exp_idx" ON "experience_responsibilities" USING btree ("experience_id","sort_order");
--> statement-breakpoint
CREATE INDEX "et_tech_idx" ON "experience_technologies" USING btree ("technology_id");
--> statement-breakpoint
CREATE INDEX "experiences_status_idx" ON "experiences" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE INDEX "experiences_org_idx" ON "experiences" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "eps_preset_section_uq" ON "export_preset_sections" USING btree ("preset_id","section_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "export_presets_slug_uq" ON "export_presets" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "login_attempts_ip_time_idx" ON "login_attempts" USING btree ("ip_hash","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "lookup_groups_code_uq" ON "lookup_groups" USING btree ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX "lookups_group_code_uq" ON "lookups" USING btree ("group_id","code");
--> statement-breakpoint
CREATE INDEX "lookups_group_sort_idx" ON "lookups" USING btree ("group_id","sort_order");
--> statement-breakpoint
CREATE INDEX "media_kind_idx" ON "media" USING btree ("kind_id");
--> statement-breakpoint
CREATE INDEX "media_time_idx" ON "media" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "messages_time_idx" ON "messages" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uq" ON "organizations" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "organizations_type_idx" ON "organizations" USING btree ("type_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "profile_socials_platform_uq" ON "profile_socials" USING btree ("profile_id","platform_id");
--> statement-breakpoint
CREATE INDEX "project_highlights_project_idx" ON "project_highlights" USING btree ("project_id","sort_order");
--> statement-breakpoint
CREATE INDEX "project_links_project_idx" ON "project_links" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "project_media_project_idx" ON "project_media" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "project_media_media_idx" ON "project_media" USING btree ("media_id");
--> statement-breakpoint
CREATE INDEX "project_metrics_project_idx" ON "project_metrics" USING btree ("project_id","sort_order");
--> statement-breakpoint
CREATE INDEX "project_responsibilities_project_idx" ON "project_responsibilities" USING btree ("project_id","sort_order");
--> statement-breakpoint
CREATE INDEX "pt_tech_idx" ON "project_technologies" USING btree ("technology_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_uq" ON "projects" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE INDEX "projects_featured_idx" ON "projects" USING btree ("featured");
--> statement-breakpoint
CREATE INDEX "projects_client_idx" ON "projects" USING btree ("client_organization_id");
--> statement-breakpoint
CREATE INDEX "publications_status_idx" ON "publications" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_token_uq" ON "share_links" USING btree ("token");
--> statement-breakpoint
CREATE UNIQUE INDEX "technologies_slug_uq" ON "technologies" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "technologies_status_idx" ON "technologies" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE INDEX "testimonials_status_idx" ON "testimonials" USING btree ("status_id","sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'user_role', 'User role', 'Peran pengguna', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'user_role'), 'owner', 'Owner', 'Pemilik', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'user_role'), 'editor', 'Editor', 'Editor', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'user_role'), 'viewer', 'Viewer', 'Peninjau', NULL, NULL, true, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'content_status', 'Content status', 'Status konten', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'content_status'), 'draft', 'Draft', 'Draf', NULL, 'muted-foreground', true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'content_status'), 'published', 'Published', 'Terbit', NULL, 'success', true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'content_status'), 'archived', 'Archived', 'Diarsipkan', NULL, 'warning', true, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'audit_action', 'Audit action', 'Aksi audit', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'create', 'Create', 'Buat', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'update', 'Update', 'Ubah', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'delete', 'Delete', 'Hapus', NULL, NULL, true, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'delete_permanent', 'Delete permanently', 'Hapus permanen', NULL, NULL, true, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'publish', 'Publish', 'Terbitkan', NULL, NULL, true, 4),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'unpublish', 'Unpublish', 'Batal terbit', NULL, NULL, true, 5),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'archive', 'Archive', 'Arsipkan', NULL, NULL, true, 6),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'restore', 'Restore', 'Pulihkan', NULL, NULL, true, 7),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'reorder', 'Reorder', 'Urutkan', NULL, NULL, true, 8),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'login', 'Login', 'Masuk', NULL, NULL, true, 9),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'logout', 'Logout', 'Keluar', NULL, NULL, true, 10),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'settings', 'Settings', 'Pengaturan', NULL, NULL, true, 11),
  ((SELECT id FROM lookup_groups WHERE code = 'audit_action'), 'import', 'Import', 'Impor', NULL, NULL, true, 12)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'event_type', 'Analytics event', 'Event analitik', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'event_type'), 'page_view', 'Page view', 'Kunjungan halaman', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'event_type'), 'link_click', 'Link click', 'Klik tautan', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'event_type'), 'cv_download', 'CV download', 'Unduh CV', NULL, NULL, true, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'event_type'), 'export_download', 'Export download', 'Unduh ekspor', NULL, NULL, true, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'event_type'), 'share_open', 'Share link opened', 'Tautan berbagi dibuka', NULL, NULL, true, 4),
  ((SELECT id FROM lookup_groups WHERE code = 'event_type'), 'video_play', 'Video play', 'Putar video', NULL, NULL, true, 5)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'locale', 'Language', 'Bahasa', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'locale'), 'en', 'English', 'Inggris', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'locale'), 'id', 'Indonesian', 'Bahasa Indonesia', NULL, NULL, true, 1)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'media_provider', 'Media provider', 'Penyedia media', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'media_provider'), 'cloudinary', 'Cloudinary', 'Cloudinary', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'media_provider'), 'youtube', 'YouTube', 'YouTube', 'youtube', NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'media_provider'), 'vimeo', 'Vimeo', 'Vimeo', 'vimeo', NULL, true, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'media_provider'), 'loom', 'Loom', 'Loom', 'loom', NULL, true, 3)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'media_kind', 'Media kind', 'Jenis media', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'media_kind'), 'image', 'Image', 'Gambar', 'image', NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'media_kind'), 'pdf', 'PDF', 'PDF', 'file-text', NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'media_kind'), 'video', 'Video', 'Video', 'video', NULL, true, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'media_kind'), 'document', 'Document / slides', 'Dokumen / slide', 'presentation', NULL, true, 3)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'document_type', 'Document type', 'Jenis dokumen', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'document_type'), 'cv', 'CV', 'CV', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'document_type'), 'portfolio_pdf', 'Portfolio PDF', 'PDF portofolio', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'document_type'), 'other', 'Other', 'Lainnya', NULL, NULL, true, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'hero_cv_buttons', 'Hero CV buttons', 'Tombol CV di hero', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'hero_cv_buttons'), 'uploaded', 'Uploaded CV only', 'Hanya CV unggahan', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'hero_cv_buttons'), 'export', 'Generated PDF only', 'Hanya PDF otomatis', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'hero_cv_buttons'), 'both', 'Both', 'Keduanya', NULL, NULL, true, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'export_template', 'Export template', 'Template ekspor', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'export_template'), 'full', 'Full', 'Lengkap', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'export_template'), 'one_page', 'One page', 'Satu halaman', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'export_template'), 'ats', 'ATS', 'ATS', NULL, NULL, true, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'site_section', 'Home page section', 'Bagian beranda', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'hero', 'Hero', 'Hero', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'about', 'About', 'Tentang', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'projects', 'Projects', 'Proyek', NULL, NULL, true, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'skills', 'Skills', 'Keahlian', NULL, NULL, true, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'experience', 'Experience', 'Pengalaman', NULL, NULL, true, 4),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'education', 'Education', 'Pendidikan', NULL, NULL, true, 5),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'certifications', 'Certifications', 'Sertifikasi', NULL, NULL, true, 6),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'activities', 'Activities', 'Aktivitas', NULL, NULL, true, 7),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'achievements', 'Achievements', 'Pencapaian', NULL, NULL, true, 8),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'publications', 'Publications', 'Publikasi', NULL, NULL, true, 9),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'testimonials', 'Testimonials', 'Testimoni', NULL, NULL, true, 10),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'github', 'GitHub', 'GitHub', NULL, NULL, true, 11),
  ((SELECT id FROM lookup_groups WHERE code = 'site_section'), 'contact', 'Contact', 'Kontak', NULL, NULL, true, 12)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'theme_preset', 'Theme preset', 'Preset tema', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'theme_preset'), 'slate', 'Slate', 'Slate', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'theme_preset'), 'forest', 'Forest', 'Forest', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'theme_preset'), 'sunset', 'Sunset', 'Sunset', NULL, NULL, true, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'theme_preset'), 'mono', 'Mono', 'Mono', NULL, NULL, true, 3)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'color_mode', 'Color mode', 'Mode warna', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'color_mode'), 'light', 'Light', 'Terang', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'color_mode'), 'dark', 'Dark', 'Gelap', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'color_mode'), 'system', 'System', 'Ikuti sistem', NULL, NULL, true, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'font_pair', 'Font pair', 'Pasangan font', true);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'font_pair'), 'geist', 'Geist', 'Geist', NULL, NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'font_pair'), 'inter', 'Inter', 'Inter', NULL, NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'font_pair'), 'serif-accent', 'Serif accent', 'Aksen serif', NULL, NULL, true, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'project_media_role', 'Project media role', 'Peran media proyek', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'project_media_role'), 'gallery', 'Gallery', 'Galeri', 'images', NULL, true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'project_media_role'), 'demo_video', 'Demo video', 'Video demo', 'video', NULL, true, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'project_media_role'), 'clip', 'Preview clip', 'Klip pratinjau', 'film', NULL, true, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'project_media_role'), 'documentation', 'Documentation', 'Dokumentasi', 'file-text', NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'project_media_role'), 'slides', 'Slides', 'Slide', 'presentation', NULL, false, 4),
  ((SELECT id FROM lookup_groups WHERE code = 'project_media_role'), 'architecture', 'Architecture diagram', 'Diagram arsitektur', 'network', NULL, false, 5)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'project_type', 'Project type', 'Jenis proyek', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'project_type'), 'company', 'Company', 'Perusahaan', 'building-2', NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'project_type'), 'freelance', 'Freelance', 'Freelance', 'briefcase', NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'project_type'), 'personal', 'Personal', 'Pribadi', 'user', NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'project_type'), 'open_source', 'Open source', 'Open source', 'git-branch', NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'project_type'), 'hackathon', 'Hackathon', 'Hackathon', 'trophy', NULL, false, 4)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'project_state', 'Project state', 'Status proyek', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'project_state'), 'live', 'Live', 'Berjalan', NULL, 'success', true, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'project_state'), 'in_development', 'In development', 'Dalam pengembangan', NULL, 'warning', false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'project_state'), 'archived', 'Archived', 'Diarsipkan', NULL, 'muted-foreground', false, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'tech_category', 'Skill category', 'Kategori keahlian', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'tech_category'), 'frontend', 'Frontend', 'Frontend', 'globe', NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_category'), 'backend', 'Backend', 'Backend', 'cpu', NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_category'), 'database', 'Databases', 'Basis Data', 'database', NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_category'), 'devops', 'DevOps & Cloud', 'DevOps & Cloud', 'layers', NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_category'), 'tools', 'Tools & Workflow', 'Alat & Alur Kerja', 'wrench', NULL, false, 4),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_category'), 'soft_skill', 'Soft skills', 'Soft skill', 'sparkles', NULL, false, 5)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'tech_group', 'Project tech group', 'Grup teknologi proyek', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'tech_group'), 'frontend', 'Frontend', 'Frontend', NULL, NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_group'), 'backend', 'Backend', 'Backend', NULL, NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_group'), 'database', 'Database', 'Basis Data', NULL, NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_group'), 'devops', 'DevOps', 'DevOps', NULL, NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'tech_group'), 'other', 'Other', 'Lainnya', NULL, NULL, true, 4)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'link_type', 'Project link type', 'Jenis tautan proyek', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'demo', 'Live demo', 'Demo', 'external-link', NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'repo_frontend', 'Frontend repo', 'Repo frontend', 'github', NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'repo_backend', 'Backend repo', 'Repo backend', 'github', NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'repo_service', 'Integration service repo', 'Repo service integrasi', 'github', NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'repo', 'Repository', 'Repositori', 'github', NULL, false, 4),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'api_docs', 'API docs', 'Dokumentasi API', 'book-open', NULL, false, 5),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'documentation', 'Documentation', 'Dokumentasi', 'file-text', NULL, false, 6),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'slides', 'Slides', 'Slide', 'presentation', NULL, false, 7),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'postman', 'Postman collection', 'Koleksi Postman', 'send', NULL, false, 8),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'design', 'Design file', 'File desain', 'figma', NULL, false, 9),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'video', 'Video', 'Video', 'video', NULL, false, 10),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'article', 'Article', 'Artikel', 'newspaper', NULL, false, 11),
  ((SELECT id FROM lookup_groups WHERE code = 'link_type'), 'other', 'Other', 'Lainnya', 'link', NULL, true, 12)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'employment_type', 'Employment type', 'Jenis pekerjaan', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'employment_type'), 'full_time', 'Full time', 'Penuh waktu', NULL, NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'employment_type'), 'part_time', 'Part time', 'Paruh waktu', NULL, NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'employment_type'), 'internship', 'Internship', 'Magang', NULL, NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'employment_type'), 'freelance', 'Freelance', 'Freelance', NULL, NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'employment_type'), 'contract', 'Contract', 'Kontrak', NULL, NULL, false, 4)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'work_mode', 'Work mode', 'Mode kerja', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'work_mode'), 'onsite', 'On-site', 'On-site', NULL, NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'work_mode'), 'hybrid', 'Hybrid', 'Hibrida', NULL, NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'work_mode'), 'remote', 'Remote', 'Remote', NULL, NULL, false, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'availability', 'Availability', 'Ketersediaan', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'availability'), 'open_to_work', 'Open to work', 'Siap bekerja', NULL, 'success', false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'availability'), 'freelance', 'Available for freelance', 'Tersedia untuk freelance', NULL, 'success', false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'availability'), 'not_available', 'Not available', 'Sedang tidak tersedia', NULL, 'muted-foreground', true, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'cert_type', 'Certificate type', 'Jenis sertifikat', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'cert_type'), 'certification', 'Certification', 'Sertifikasi', NULL, NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'cert_type'), 'course', 'Course', 'Kursus', NULL, NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'cert_type'), 'bootcamp', 'Bootcamp', 'Bootcamp', NULL, NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'cert_type'), 'training', 'Training', 'Pelatihan', NULL, NULL, false, 3)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'activity_type', 'Activity type', 'Jenis aktivitas', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'activity_type'), 'volunteer', 'Volunteer', 'Relawan', NULL, NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'activity_type'), 'committee', 'Committee', 'Kepanitiaan', NULL, NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'activity_type'), 'organization', 'Organization', 'Organisasi', NULL, NULL, false, 2)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'publication_type', 'Publication type', 'Jenis publikasi', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'publication_type'), 'article', 'Article', 'Artikel', NULL, NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'publication_type'), 'paper', 'Paper', 'Makalah', NULL, NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'publication_type'), 'talk', 'Talk', 'Presentasi', NULL, NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'publication_type'), 'workshop', 'Workshop', 'Workshop', NULL, NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'publication_type'), 'podcast', 'Podcast', 'Podcast', NULL, NULL, false, 4)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'organization_type', 'Organization type', 'Jenis organisasi', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'organization_type'), 'company', 'Company', 'Perusahaan', 'building-2', NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'organization_type'), 'client', 'Client', 'Klien', 'handshake', NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'organization_type'), 'education', 'Educational institution', 'Institusi pendidikan', 'graduation-cap', NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'organization_type'), 'certification_issuer', 'Certification issuer', 'Penerbit sertifikat', 'badge-check', NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'organization_type'), 'community', 'Community / organization', 'Komunitas / organisasi', 'users', NULL, false, 4),
  ((SELECT id FROM lookup_groups WHERE code = 'organization_type'), 'event_organizer', 'Event organizer', 'Penyelenggara acara', 'calendar', NULL, false, 5),
  ((SELECT id FROM lookup_groups WHERE code = 'organization_type'), 'self', 'Self-employed', 'Mandiri', 'user', NULL, false, 6)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'social_platform', 'Social platform', 'Platform sosial', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'github', 'GitHub', 'GitHub', 'github', NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'linkedin', 'LinkedIn', 'LinkedIn', 'linkedin', NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'x', 'X', 'X', 'x', NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'instagram', 'Instagram', 'Instagram', 'instagram', NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'youtube', 'YouTube', 'YouTube', 'youtube', NULL, false, 4),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'whatsapp', 'WhatsApp', 'WhatsApp', 'whatsapp', NULL, false, 5),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'telegram', 'Telegram', 'Telegram', 'telegram', NULL, false, 6),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'discord', 'Discord', 'Discord', 'discord', NULL, false, 7),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'gitlab', 'GitLab', 'GitLab', 'gitlab', NULL, false, 8),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'threads', 'Threads', 'Threads', 'threads', NULL, false, 9),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'facebook', 'Facebook', 'Facebook', 'facebook', NULL, false, 10),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'tiktok', 'TikTok', 'TikTok', 'tiktok', NULL, false, 11),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'medium', 'Medium', 'Medium', 'medium', NULL, false, 12),
  ((SELECT id FROM lookup_groups WHERE code = 'social_platform'), 'website', 'Website', 'Situs web', 'globe', NULL, false, 13)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
INSERT INTO lookup_groups (id, code, name_en, name_id, is_system) VALUES (gen_random_uuid(), 'language_level', 'Language level', 'Tingkat bahasa', false);
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order) SELECT gen_random_uuid(), v.* FROM (VALUES
  ((SELECT id FROM lookup_groups WHERE code = 'language_level'), 'native', 'Native', 'Bahasa ibu', NULL, NULL, false, 0),
  ((SELECT id FROM lookup_groups WHERE code = 'language_level'), 'fluent', 'Fluent', 'Fasih', NULL, NULL, false, 1),
  ((SELECT id FROM lookup_groups WHERE code = 'language_level'), 'professional', 'Professional', 'Profesional', NULL, NULL, false, 2),
  ((SELECT id FROM lookup_groups WHERE code = 'language_level'), 'intermediate', 'Intermediate', 'Menengah', NULL, NULL, false, 3),
  ((SELECT id FROM lookup_groups WHERE code = 'language_level'), 'basic', 'Basic', 'Dasar', NULL, NULL, false, 4)
) AS v(group_id, code, label_en, label_id, icon, color, is_system, sort_order);
--> statement-breakpoint
-- ===== Helpers (dropped at the end) =====
CREATE FUNCTION public._lk(g text, c text) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT l.id FROM public.lookups l JOIN public.lookup_groups gr ON gr.id = l.group_id
  WHERE gr.code = g AND l.code = c
$$;
--> statement-breakpoint
CREATE FUNCTION public._slug(n text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from regexp_replace(lower(trim(n)), '[^a-z0-9]+', '-', 'g'))
$$;
--> statement-breakpoint
CREATE FUNCTION public._org(n text) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM public.organizations WHERE slug = public._slug(n)
$$;
--> statement-breakpoint
-- ===== Lookup values that only exist in the data (social keys, language levels) =====
INSERT INTO lookups (id, group_id, code, label_en, sort_order)
SELECT gen_random_uuid(), g.id, k.key, initcap(replace(k.key, '_', ' ')), 100
FROM legacy.profile p CROSS JOIN LATERAL jsonb_object_keys(p.socials) AS k(key)
JOIN lookup_groups g ON g.code = 'social_platform'
WHERE public._lk('social_platform', k.key) IS NULL;
--> statement-breakpoint
INSERT INTO lookups (id, group_id, code, label_en, sort_order)
SELECT DISTINCT ON (e->>'level') gen_random_uuid(), g.id, e->>'level', initcap(e->>'level'), 100
FROM legacy.profile p CROSS JOIN LATERAL jsonb_array_elements(p.languages) e
JOIN lookup_groups g ON g.code = 'language_level'
WHERE public._lk('language_level', e->>'level') IS NULL;
--> statement-breakpoint
-- ===== Access & security =====
INSERT INTO users (id, email, name, password_hash, role_id, totp_secret, totp_enabled, token_version, is_active, last_login_at, created_at, updated_at)
SELECT id, email, name, password_hash, public._lk('user_role', role::text), totp_secret, totp_enabled, token_version, is_active, last_login_at, created_at, updated_at
FROM legacy.users;
--> statement-breakpoint
INSERT INTO login_attempts SELECT id, ip_hash, email, success, created_at FROM legacy.login_attempts;
--> statement-breakpoint
INSERT INTO audit_logs (id, user_id, action_id, resource, resource_id, summary, created_at)
SELECT id, user_id, public._lk('audit_action', action::text), resource, resource_id, summary, created_at FROM legacy.audit_logs;
--> statement-breakpoint
INSERT INTO media (id, provider_id, kind_id, public_id, embed_id, url, mime, width, height, bytes, duration_sec, thumbnail_url, captions_url, title_en, title_id, alt_en, alt_id, uploaded_by, deleted_at, created_at, updated_at)
SELECT id, public._lk('media_provider', provider::text), public._lk('media_kind', kind::text), public_id, embed_id, url, mime, width, height, bytes, duration_sec, thumbnail_url, captions_url, title_en, title_id, alt_en, alt_id, uploaded_by, deleted_at, created_at, updated_at
FROM legacy.media;
--> statement-breakpoint
-- ===== Organizations: every free-text org name, deduplicated by slug =====
INSERT INTO organizations (id, name, slug, type_id, logo_media_id, website_url, location, status_id, published_at, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), o.name, o.slug, public._lk('organization_type', o.type), o.logo, o.url, o.location,
       public._lk('content_status', 'published'), now(), row_number() OVER (ORDER BY o.prio, o.name) - 1, now(), now()
FROM (
  SELECT public._slug(name) AS slug,
         (array_agg(trim(name) ORDER BY prio))[1] AS name,
         (array_agg(type ORDER BY prio))[1] AS type,
         min(prio) AS prio,
         (array_agg(logo ORDER BY prio) FILTER (WHERE logo IS NOT NULL))[1] AS logo,
         (array_agg(url ORDER BY prio) FILTER (WHERE url IS NOT NULL))[1] AS url,
         (array_agg(location ORDER BY prio) FILTER (WHERE location IS NOT NULL))[1] AS location
  FROM (
    SELECT company AS name, 'company' AS type, 1 AS prio, company_media_id AS logo, company_url AS url, location FROM legacy.experiences
    UNION ALL SELECT institution, 'education', 2, logo_media_id, NULL, NULL FROM legacy.education
    UNION ALL SELECT issuer, 'certification_issuer', 3, issuer_media_id, NULL, NULL FROM legacy.certifications
    UNION ALL SELECT organization, 'community', 4, NULL, NULL, NULL FROM legacy.activities
    UNION ALL SELECT issuer, 'event_organizer', 5, NULL, NULL, NULL FROM legacy.achievements
    UNION ALL SELECT company, 'company', 6, NULL, NULL, NULL FROM legacy.testimonials
    UNION ALL SELECT client, 'client', 7, NULL, NULL, NULL FROM legacy.projects
  ) src
  WHERE public._slug(coalesce(name, '')) <> ''
  GROUP BY public._slug(name)
) o;
--> statement-breakpoint
-- ===== Profile & settings =====
INSERT INTO profile (id, name, headline_en, headline_id, bio_en, bio_id, avatar_media_id, location, timezone, email, availability_id, work_preference_id, references_note_en, references_note_id, career_start_date, created_at, updated_at)
SELECT id, name, headline_en, headline_id, bio_en, bio_id, avatar_media_id, location, timezone, email,
       public._lk('availability', availability::text), public._lk('work_mode', work_preference::text),
       references_note_en, references_note_id, career_start_date, created_at, updated_at
FROM legacy.profile;
--> statement-breakpoint
INSERT INTO profile_socials (id, profile_id, platform_id, url, sort_order)
SELECT gen_random_uuid(), p.id, public._lk('social_platform', s.key), s.value, s.ord - 1
FROM legacy.profile p CROSS JOIN LATERAL jsonb_each_text(p.socials) WITH ORDINALITY AS s(key, value, ord);
--> statement-breakpoint
INSERT INTO profile_languages (id, profile_id, name_en, level_id, sort_order)
SELECT gen_random_uuid(), p.id, e.v->>'name', public._lk('language_level', e.v->>'level'), e.ord - 1
FROM legacy.profile p CROSS JOIN LATERAL jsonb_array_elements(p.languages) WITH ORDINALITY AS e(v, ord);
--> statement-breakpoint
INSERT INTO profile_interests (id, profile_id, label_en, label_id, icon, sort_order)
SELECT gen_random_uuid(), p.id, e.v->>'label_en', e.v->>'label_id', e.v->>'icon', e.ord - 1
FROM legacy.profile p CROSS JOIN LATERAL jsonb_array_elements(p.interests) WITH ORDINALITY AS e(v, ord);
--> statement-breakpoint
INSERT INTO site_settings (id, theme_preset_id, color_mode_id, font_pair_id, hero_cv_buttons_id, seo_title_en, seo_title_id, seo_description_en, seo_description_id, og_media_id, created_at, updated_at)
SELECT id, public._lk('theme_preset', theme_preset), public._lk('color_mode', color_mode), public._lk('font_pair', font_pair),
       public._lk('hero_cv_buttons', hero_cv_buttons::text), seo_title_en, seo_title_id, seo_description_en, seo_description_id, og_media_id, created_at, updated_at
FROM legacy.site_settings;
--> statement-breakpoint
-- Sections in the saved order, then any section the saved order didn't mention (visible, at the end).
INSERT INTO site_sections (section_id, sort_order, is_visible)
SELECT public._lk('site_section', e.code), e.ord - 1, NOT (s.hidden_sections ? e.code)
FROM legacy.site_settings s CROSS JOIN LATERAL jsonb_array_elements_text(s.section_order) WITH ORDINALITY AS e(code, ord);
--> statement-breakpoint
INSERT INTO site_sections (section_id, sort_order, is_visible)
SELECT l.id, 1000 + l.sort_order, true
FROM lookups l JOIN lookup_groups g ON g.id = l.group_id
WHERE g.code = 'site_section' AND NOT EXISTS (SELECT 1 FROM site_sections ss WHERE ss.section_id = l.id);
--> statement-breakpoint
-- ===== Content =====
INSERT INTO technologies (id, name, slug, category_id, icon, show_on_skills, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, name, slug, public._lk('tech_category', category::text), icon, show_on_skills,
       public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.technologies;
--> statement-breakpoint
INSERT INTO projects (id, slug, title_en, title_id, summary_en, summary_id, type_id, state_id, role_en, team_size, client_organization_id, period_start, period_end, problem_en, problem_id, solution_en, solution_id, result_en, result_id, challenges_en, challenges_id, cover_media_id, architecture_media_id, featured, meta_title_en, meta_title_id, meta_description_en, meta_description_id, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, slug, title_en, title_id, summary_en, summary_id, public._lk('project_type', type::text), public._lk('project_state', project_state::text),
       role, team_size, public._org(client), period_start, period_end, problem_en, problem_id, solution_en, solution_id, result_en, result_id, challenges_en, challenges_id,
       cover_media_id, architecture_media_id, featured, meta_title_en, meta_title_id, meta_description_en, meta_description_id,
       public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.projects;
--> statement-breakpoint
INSERT INTO project_metrics (id, project_id, label_en, label_id, value, sort_order)
SELECT gen_random_uuid(), p.id, e.v->>'label_en', e.v->>'label_id', e.v->>'value', e.ord - 1
FROM legacy.projects p CROSS JOIN LATERAL jsonb_array_elements(p.metrics) WITH ORDINALITY AS e(v, ord);
--> statement-breakpoint
INSERT INTO project_highlights (id, project_id, text_en, text_id, sort_order)
SELECT gen_random_uuid(), p.id, e.v->>'text_en', e.v->>'text_id', e.ord - 1
FROM legacy.projects p CROSS JOIN LATERAL jsonb_array_elements(p.highlights) WITH ORDINALITY AS e(v, ord);
--> statement-breakpoint
INSERT INTO project_technologies (project_id, technology_id, group_id, sort_order)
SELECT project_id, technology_id, public._lk('tech_group', "group"::text), sort_order FROM legacy.project_technologies;
--> statement-breakpoint
INSERT INTO project_links (id, project_id, type_id, label, url, is_private, sort_order, created_at, updated_at)
SELECT id, project_id, public._lk('link_type', type::text), label, url, is_private, sort_order, created_at, updated_at FROM legacy.project_links;
--> statement-breakpoint
INSERT INTO project_media (id, project_id, media_id, role_id, caption_en, caption_id, sort_order)
SELECT id, project_id, media_id, public._lk('project_media_role', role::text), caption_en, caption_id, sort_order FROM legacy.project_media;
--> statement-breakpoint
INSERT INTO experiences (id, organization_id, role_en, role_id, employment_type_id, location, work_mode_id, start_date, end_date, description_en, description_id, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, public._org(company), role_en, role_id, public._lk('employment_type', employment_type::text), location, public._lk('work_mode', work_mode::text),
       start_date, end_date, description_en, description_id, public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.experiences;
--> statement-breakpoint
-- The old "achievements" bullets describe the job itself, so they become responsibilities.
INSERT INTO experience_responsibilities (id, experience_id, text_en, text_id, sort_order)
SELECT gen_random_uuid(), x.id, e.v->>'text_en', e.v->>'text_id', e.ord - 1
FROM legacy.experiences x CROSS JOIN LATERAL jsonb_array_elements(x.achievements) WITH ORDINALITY AS e(v, ord);
--> statement-breakpoint
INSERT INTO experience_technologies SELECT experience_id, technology_id FROM legacy.experience_technologies;
--> statement-breakpoint
-- Link each project to every position whose period contains the project's start date;
-- freelance projects only go to freelance positions (and vice versa) so overlapping jobs don't mix.
INSERT INTO experience_projects (experience_id, project_id, sort_order)
SELECT x.id, p.id, row_number() OVER (PARTITION BY x.id ORDER BY p.sort_order, p.period_start) - 1
FROM legacy.projects p JOIN legacy.experiences x
  ON p.period_start >= x.start_date AND (x.end_date IS NULL OR p.period_start <= x.end_date)
 AND (p.type::text = 'freelance') = (x.employment_type::text = 'freelance')
WHERE p.period_start IS NOT NULL;
--> statement-breakpoint
INSERT INTO education (id, organization_id, degree, field_en, field_id, start_date, end_date, gpa, gpa_scale, description_en, description_id, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, public._org(institution), degree, field_en, field_id, start_date, end_date, gpa, gpa_scale, description_en, description_id,
       public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.education;
--> statement-breakpoint
INSERT INTO education_activities (id, education_id, text_en, text_id, sort_order)
SELECT gen_random_uuid(), x.id, e.v->>'text_en', e.v->>'text_id', e.ord - 1
FROM legacy.education x CROSS JOIN LATERAL jsonb_array_elements(x.activities) WITH ORDINALITY AS e(v, ord);
--> statement-breakpoint
INSERT INTO certifications (id, type_id, name, issuer_organization_id, issue_date, expiry_date, credential_id, credential_url, image_media_id, featured, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, public._lk('cert_type', type::text), name, public._org(issuer), issue_date, expiry_date, credential_id, credential_url, image_media_id, featured,
       public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.certifications;
--> statement-breakpoint
INSERT INTO activities (id, type_id, organization_id, event_name, role_en, role_id, start_date, end_date, description_en, description_id, media_id, link_url, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, public._lk('activity_type', type::text), public._org(organization), event_name, role_en, role_id, start_date, end_date, description_en, description_id, media_id, link_url,
       public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.activities;
--> statement-breakpoint
INSERT INTO activity_achievements (id, activity_id, text_en, text_id, sort_order)
SELECT gen_random_uuid(), x.id, e.v->>'text_en', e.v->>'text_id', e.ord - 1
FROM legacy.activities x CROSS JOIN LATERAL jsonb_array_elements(x.achievements) WITH ORDINALITY AS e(v, ord);
--> statement-breakpoint
INSERT INTO achievements (id, title_en, title_id, issuer_organization_id, event_name, rank, date, description_en, description_id, certificate_media_id, link_url, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, title_en, title_id, public._org(issuer), event_name, rank, date, description_en, description_id, certificate_media_id, link_url,
       public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.achievements;
--> statement-breakpoint
INSERT INTO publications (id, type_id, title, venue, date, summary_en, summary_id, url, video_media_id, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, public._lk('publication_type', type::text), title, venue, date, summary_en, summary_id, url, video_media_id,
       public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.publications;
--> statement-breakpoint
INSERT INTO testimonials (id, name, position, organization_id, avatar_media_id, relationship, quote_en, quote_id, linkedin_url, status_id, published_at, sort_order, deleted_at, created_at, updated_at)
SELECT id, name, position, public._org(company), avatar_media_id, relationship, quote_en, quote_id, linkedin_url,
       public._lk('content_status', status::text), published_at, sort_order, deleted_at, created_at, updated_at
FROM legacy.testimonials;
--> statement-breakpoint
-- ===== Documents & sharing =====
INSERT INTO documents (id, media_id, type_id, locale_id, title, version, page_count, is_active, notes, created_at, updated_at)
SELECT id, media_id, public._lk('document_type', type::text), public._lk('locale', locale::text), title, version, page_count, is_active, notes, created_at, updated_at
FROM legacy.documents;
--> statement-breakpoint
INSERT INTO export_presets (id, slug, name, template_id, locale_id, featured_only, since_years, is_public, sort_order, created_at, updated_at)
SELECT id, slug, name, public._lk('export_template', template::text), public._lk('locale', locale::text),
       coalesce((item_filter->>'featuredOnly')::boolean, false), (item_filter->>'sinceYears')::smallint, is_public, sort_order, created_at, updated_at
FROM legacy.export_presets;
--> statement-breakpoint
INSERT INTO export_preset_sections (id, preset_id, section_id, item_limit, sort_order)
SELECT gen_random_uuid(), p.id,
       public._lk('site_section', CASE e.v->>'key' WHEN 'experiences' THEN 'experience' WHEN 'technologies' THEN 'skills' ELSE e.v->>'key' END),
       (e.v->>'limit')::smallint, e.ord - 1
FROM legacy.export_presets p CROSS JOIN LATERAL jsonb_array_elements(p.sections) WITH ORDINALITY AS e(v, ord);
--> statement-breakpoint
INSERT INTO export_preset_technologies (preset_id, technology_id)
SELECT p.id, t.value::uuid
FROM legacy.export_presets p CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(p.item_filter->'technologyIds', '[]'::jsonb)) AS t(value);
--> statement-breakpoint
INSERT INTO share_links SELECT id, token, label, document_id, preset_id, expires_at, is_active, view_count, last_opened_at, created_by, created_at, updated_at FROM legacy.share_links;
--> statement-breakpoint
-- ===== Interaction & analytics =====
INSERT INTO messages (id, name, email, subject, body, locale_id, is_read, is_archived, created_at)
SELECT id, name, email, subject, body, public._lk('locale', locale::text), is_read, is_archived, created_at FROM legacy.messages;
--> statement-breakpoint
INSERT INTO events (id, type_id, path, locale_id, project_id, target, share_link_id, visitor_hash, country, referrer, utm_source, utm_campaign, device, created_at)
SELECT id, public._lk('event_type', type::text), path, public._lk('locale', locale::text), project_id, target, share_link_id, visitor_hash, country, referrer, utm_source, utm_campaign, device, created_at
FROM legacy.events;
--> statement-breakpoint
INSERT INTO daily_stats (date, type_id, path, target, count, unique_visitors)
SELECT date, public._lk('event_type', type::text), path, target, count, unique_visitors FROM legacy.daily_stats;
--> statement-breakpoint
INSERT INTO github_cache SELECT key, data, fetched_at FROM legacy.github_cache;
--> statement-breakpoint
-- ===== Cleanup =====
DROP FUNCTION public._org(text);
--> statement-breakpoint
DROP FUNCTION public._slug(text);
--> statement-breakpoint
DROP FUNCTION public._lk(text, text);
--> statement-breakpoint
DROP SCHEMA legacy CASCADE;
--> statement-breakpoint
DROP TYPE public.activity_type, public.audit_action, public.availability, public.cert_type, public.content_status,
  public.document_type, public.employment_type, public.event_type, public.export_template, public.hero_cv_buttons,
  public.link_type, public.locale, public.media_kind, public.media_provider, public.project_media_role,
  public.project_state, public.project_type, public.publication_type, public.tech_category, public.tech_group,
  public.user_role, public.work_mode;
