create table "public"."prebuilt_sops" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text not null,
    "steps" jsonb not null
);


alter table "public"."prebuilt_sops" enable row level security;

CREATE UNIQUE INDEX prebuilt_sops_pkey ON public.prebuilt_sops USING btree (id);

alter table "public"."prebuilt_sops" add constraint "prebuilt_sops_pkey" PRIMARY KEY using index "prebuilt_sops_pkey";

grant delete on table "public"."prebuilt_sops" to "anon";

grant insert on table "public"."prebuilt_sops" to "anon";

grant references on table "public"."prebuilt_sops" to "anon";

grant select on table "public"."prebuilt_sops" to "anon";

grant trigger on table "public"."prebuilt_sops" to "anon";

grant truncate on table "public"."prebuilt_sops" to "anon";

grant update on table "public"."prebuilt_sops" to "anon";

grant delete on table "public"."prebuilt_sops" to "authenticated";

grant insert on table "public"."prebuilt_sops" to "authenticated";

grant references on table "public"."prebuilt_sops" to "authenticated";

grant select on table "public"."prebuilt_sops" to "authenticated";

grant trigger on table "public"."prebuilt_sops" to "authenticated";

grant truncate on table "public"."prebuilt_sops" to "authenticated";

grant update on table "public"."prebuilt_sops" to "authenticated";

grant delete on table "public"."prebuilt_sops" to "service_role";

grant insert on table "public"."prebuilt_sops" to "service_role";

grant references on table "public"."prebuilt_sops" to "service_role";

grant select on table "public"."prebuilt_sops" to "service_role";

grant trigger on table "public"."prebuilt_sops" to "service_role";

grant truncate on table "public"."prebuilt_sops" to "service_role";

grant update on table "public"."prebuilt_sops" to "service_role";

create policy "Enable read access for all users"
on "public"."prebuilt_sops"
as permissive
for select
to public
using (true);



