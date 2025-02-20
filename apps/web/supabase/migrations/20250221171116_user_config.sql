create table "public"."user_configs" (
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "config" jsonb
);


alter table "public"."user_configs" enable row level security;

CREATE UNIQUE INDEX user_configs_pkey ON public.user_configs USING btree (user_id);

alter table "public"."user_configs" add constraint "user_configs_pkey" PRIMARY KEY using index "user_configs_pkey";

alter table "public"."user_configs" add constraint "user_configs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_configs" validate constraint "user_configs_user_id_fkey";

grant delete on table "public"."user_configs" to "anon";

grant insert on table "public"."user_configs" to "anon";

grant references on table "public"."user_configs" to "anon";

grant select on table "public"."user_configs" to "anon";

grant trigger on table "public"."user_configs" to "anon";

grant truncate on table "public"."user_configs" to "anon";

grant update on table "public"."user_configs" to "anon";

grant delete on table "public"."user_configs" to "authenticated";

grant insert on table "public"."user_configs" to "authenticated";

grant references on table "public"."user_configs" to "authenticated";

grant select on table "public"."user_configs" to "authenticated";

grant trigger on table "public"."user_configs" to "authenticated";

grant truncate on table "public"."user_configs" to "authenticated";

grant update on table "public"."user_configs" to "authenticated";

grant delete on table "public"."user_configs" to "service_role";

grant insert on table "public"."user_configs" to "service_role";

grant references on table "public"."user_configs" to "service_role";

grant select on table "public"."user_configs" to "service_role";

grant trigger on table "public"."user_configs" to "service_role";

grant truncate on table "public"."user_configs" to "service_role";

grant update on table "public"."user_configs" to "service_role";

create policy "all access"
on "public"."user_configs"
as permissive
for all
to public
using (true);



