CREATE TYPE "public"."activity_type" AS ENUM('volunteer', 'committee', 'organization');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'delete_permanent', 'publish', 'unpublish', 'archive', 'restore', 'reorder', 'login', 'logout', 'settings', 'import');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('open_to_work', 'freelance', 'not_available');--> statement-breakpoint
CREATE TYPE "public"."cert_type" AS ENUM('certification', 'course', 'bootcamp', 'training');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('cv', 'portfolio_pdf', 'other');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'internship', 'freelance', 'contract');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('page_view', 'link_click', 'cv_download', 'export_download', 'share_open', 'video_play');--> statement-breakpoint
CREATE TYPE "public"."export_template" AS ENUM('full', 'one_page', 'ats');--> statement-breakpoint
CREATE TYPE "public"."hero_cv_buttons" AS ENUM('uploaded', 'export', 'both');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('demo', 'repo_frontend', 'repo_backend', 'repo', 'api_docs', 'postman', 'design', 'video', 'article', 'other');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'id');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'pdf', 'video');--> statement-breakpoint
CREATE TYPE "public"."media_provider" AS ENUM('cloudinary', 'youtube', 'vimeo', 'loom');--> statement-breakpoint
CREATE TYPE "public"."project_media_role" AS ENUM('gallery', 'demo_video', 'clip');--> statement-breakpoint
CREATE TYPE "public"."project_state" AS ENUM('live', 'in_development', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('personal', 'freelance', 'company', 'open_source', 'hackathon');--> statement-breakpoint
CREATE TYPE "public"."publication_type" AS ENUM('article', 'paper', 'talk', 'workshop', 'podcast');--> statement-breakpoint
CREATE TYPE "public"."tech_category" AS ENUM('frontend', 'backend', 'database', 'devops', 'tools', 'soft_skill');--> statement-breakpoint
CREATE TYPE "public"."tech_group" AS ENUM('frontend', 'backend', 'database', 'devops', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title_en" varchar(160) NOT NULL,
	"title_id" varchar(160),
	"issuer" varchar(120),
	"event_name" varchar(160),
	"rank" varchar(60),
	"date" date,
	"description_en" text,
	"description_id" text,
	"certificate_media_id" uuid,
	"link_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "activity_type" NOT NULL,
	"organization" varchar(120) NOT NULL,
	"event_name" varchar(160),
	"role_en" varchar(100) NOT NULL,
	"role_id" varchar(100),
	"start_date" date,
	"end_date" date,
	"description_en" text,
	"description_id" text,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"media_id" uuid,
	"link_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource" varchar(40) NOT NULL,
	"resource_id" varchar(64),
	"summary" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "cert_type" DEFAULT 'certification' NOT NULL,
	"name" varchar(160) NOT NULL,
	"issuer" varchar(100) NOT NULL,
	"issuer_media_id" uuid,
	"issue_date" date,
	"expiry_date" date,
	"credential_id" varchar(120),
	"credential_url" text,
	"image_media_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"date" date NOT NULL,
	"type" "event_type" NOT NULL,
	"path" varchar(300) DEFAULT '' NOT NULL,
	"target" varchar(60) DEFAULT '' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_stats_date_type_path_target_pk" PRIMARY KEY("date","type","path","target")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"media_id" uuid NOT NULL,
	"type" "document_type" DEFAULT 'cv' NOT NULL,
	"locale" "locale" NOT NULL,
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
	"institution" varchar(120) NOT NULL,
	"logo_media_id" uuid,
	"degree" varchar(100),
	"field_en" varchar(120),
	"field_id" varchar(120),
	"start_date" date,
	"end_date" date,
	"gpa" numeric(4, 2),
	"gpa_scale" numeric(4, 2),
	"description_en" text,
	"description_id" text,
	"activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "event_type" NOT NULL,
	"path" varchar(300) NOT NULL,
	"locale" "locale",
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
CREATE TABLE "experience_technologies" (
	"experience_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	CONSTRAINT "experience_technologies_experience_id_technology_id_pk" PRIMARY KEY("experience_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company" varchar(100) NOT NULL,
	"company_media_id" uuid,
	"company_url" text,
	"role_en" varchar(100) NOT NULL,
	"role_id" varchar(100),
	"employment_type" "employment_type" NOT NULL,
	"location" varchar(100),
	"work_mode" "work_mode",
	"start_date" date NOT NULL,
	"end_date" date,
	"description_en" text,
	"description_id" text,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_presets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(60) NOT NULL,
	"name" varchar(80) NOT NULL,
	"template" "export_template" DEFAULT 'full' NOT NULL,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"sections" jsonb NOT NULL,
	"item_filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
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
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" "media_provider" NOT NULL,
	"kind" "media_kind" NOT NULL,
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
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"socials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"availability" "availability" DEFAULT 'open_to_work' NOT NULL,
	"work_preference" "work_mode" DEFAULT 'remote' NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"references_note_en" varchar(300),
	"references_note_id" varchar(300),
	"career_start_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "link_type" NOT NULL,
	"label" varchar(60) NOT NULL,
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
	"role" "project_media_role" DEFAULT 'gallery' NOT NULL,
	"caption_en" varchar(200),
	"caption_id" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_technologies" (
	"project_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	"group" "tech_group" DEFAULT 'other' NOT NULL,
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
	"type" "project_type" NOT NULL,
	"project_state" "project_state" DEFAULT 'live' NOT NULL,
	"role" varchar(80),
	"team_size" smallint,
	"client" varchar(100),
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
	"metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_media_id" uuid,
	"architecture_media_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"meta_title_en" varchar(70),
	"meta_title_id" varchar(70),
	"meta_description_en" varchar(160),
	"meta_description_id" varchar(160),
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "publication_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"venue" varchar(160),
	"date" date,
	"summary_en" text,
	"summary_id" text,
	"url" text,
	"video_media_id" uuid,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
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
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"theme_preset" varchar(20) DEFAULT 'slate' NOT NULL,
	"color_mode" varchar(10) DEFAULT 'system' NOT NULL,
	"font_pair" varchar(20) DEFAULT 'geist' NOT NULL,
	"section_order" jsonb DEFAULT '["hero","about","projects","skills","experience","education","certifications","activities","achievements","publications","testimonials","github","contact"]'::jsonb NOT NULL,
	"hidden_sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero_cv_buttons" "hero_cv_buttons" DEFAULT 'both' NOT NULL,
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
	"category" "tech_category" NOT NULL,
	"icon" varchar(60),
	"show_on_skills" boolean DEFAULT true NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
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
	"company" varchar(100),
	"avatar_media_id" uuid,
	"relationship" varchar(100),
	"quote_en" text NOT NULL,
	"quote_id" text,
	"linkedin_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
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
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_certificate_media_id_media_id_fk" FOREIGN KEY ("certificate_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_issuer_media_id_media_id_fk" FOREIGN KEY ("issuer_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_company_media_id_media_id_fk" FOREIGN KEY ("company_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_avatar_media_id_media_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_architecture_media_id_media_id_fk" FOREIGN KEY ("architecture_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_video_media_id_media_id_fk" FOREIGN KEY ("video_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_preset_id_export_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."export_presets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_media_id_media_id_fk" FOREIGN KEY ("og_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_avatar_media_id_media_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_status_idx" ON "achievements" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "activities_status_idx" ON "activities" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "audit_logs_time_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "certifications_status_idx" ON "certifications" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "documents_type_locale_idx" ON "documents" USING btree ("type","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_one_active_uq" ON "documents" USING btree ("type","locale") WHERE "documents"."is_active" = true;--> statement-breakpoint
CREATE INDEX "education_status_idx" ON "education" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "events_time_idx" ON "events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "events_type_time_idx" ON "events" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "events_project_idx" ON "events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "et_tech_idx" ON "experience_technologies" USING btree ("technology_id");--> statement-breakpoint
CREATE INDEX "experiences_status_idx" ON "experiences" USING btree ("status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "export_presets_slug_uq" ON "export_presets" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_time_idx" ON "login_attempts" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "media_kind_idx" ON "media" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "media_time_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_time_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_links_project_idx" ON "project_links" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_media_project_idx" ON "project_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_media_media_idx" ON "project_media" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "pt_tech_idx" ON "project_technologies" USING btree ("technology_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_uq" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "projects_featured_idx" ON "projects" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "publications_status_idx" ON "publications" USING btree ("status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_token_uq" ON "share_links" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "technologies_slug_uq" ON "technologies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "technologies_status_idx" ON "technologies" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "testimonials_status_idx" ON "testimonials" USING btree ("status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));