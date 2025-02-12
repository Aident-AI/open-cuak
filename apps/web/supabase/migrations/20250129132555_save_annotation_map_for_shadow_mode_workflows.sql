alter table "public"."shadow_mode_workflows" add column "annotation_map" jsonb not null default '{}'::jsonb;


