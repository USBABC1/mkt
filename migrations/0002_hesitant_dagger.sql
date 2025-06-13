-- Este script cria tipos, tabelas e define relacionamentos para uma aplicação de gerenciamento de campanhas.
-- As verificações "IF NOT EXISTS" garantem que o script pode ser executado várias vezes sem causar erros.

DO $$
BEGIN
    -- Cria o tipo ENUM 'integration_platform' se ele não existir.
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_platform') THEN
        CREATE TYPE "public"."integration_platform" AS ENUM('shopify', 'hotmart', 'meta', 'google');
    END IF;

    -- Cria o tipo ENUM 'task_status' se ele não existir.
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'on_hold');
    END IF;
END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"assignee_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" "integration_platform" NOT NULL,
	"credentials" jsonb NOT NULL,
	"metadata" jsonb,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"last_sync" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
    -- Altera a coluna 'password' na tabela 'users' para permitir valores NULL, se ainda não permitir.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password' AND is_nullable = 'NO') THEN
        ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
    END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
    -- Adiciona a coluna 'is_template' na tabela 'campaigns', se ela não existir.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='is_template') THEN
        ALTER TABLE "campaigns" ADD COLUMN "is_template" boolean DEFAULT false NOT NULL;
    END IF;
END
$$;
--> statement-breakpoint
-- Adiciona as chaves estrangeiras, se não existirem.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_phases_campaign_id_campaigns_id_fk') THEN
        ALTER TABLE "campaign_phases" ADD CONSTRAINT "campaign_phases_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_tasks_phase_id_campaign_phases_id_fk') THEN
        ALTER TABLE "campaign_tasks" ADD CONSTRAINT "campaign_tasks_phase_id_campaign_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."campaign_phases"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_tasks_assignee_id_users_id_fk') THEN
        ALTER TABLE "campaign_tasks" ADD CONSTRAINT "campaign_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integrations_user_id_users_id_fk') THEN
        ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END
$$;
--> statement-breakpoint
-- CORREÇÃO: Bloco para adicionar a coluna 'generation_options' na tabela 'landing_pages'.
-- A verificação foi corrigida para checar se a coluna já existe na tabela correta.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'landing_pages' AND column_name = 'generation_options') THEN
        ALTER TABLE "public"."landing_pages" ADD COLUMN "generation_options" jsonb;
    END IF;
END
$$;
