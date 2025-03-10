revoke delete on table "public"."mock_users" from "anon";

revoke insert on table "public"."mock_users" from "anon";

revoke references on table "public"."mock_users" from "anon";

revoke select on table "public"."mock_users" from "anon";

revoke trigger on table "public"."mock_users" from "anon";

revoke truncate on table "public"."mock_users" from "anon";

revoke update on table "public"."mock_users" from "anon";

revoke delete on table "public"."mock_users" from "authenticated";

revoke insert on table "public"."mock_users" from "authenticated";

revoke references on table "public"."mock_users" from "authenticated";

revoke select on table "public"."mock_users" from "authenticated";

revoke trigger on table "public"."mock_users" from "authenticated";

revoke truncate on table "public"."mock_users" from "authenticated";

revoke update on table "public"."mock_users" from "authenticated";

revoke delete on table "public"."mock_users" from "service_role";

revoke insert on table "public"."mock_users" from "service_role";

revoke references on table "public"."mock_users" from "service_role";

revoke select on table "public"."mock_users" from "service_role";

revoke trigger on table "public"."mock_users" from "service_role";

revoke truncate on table "public"."mock_users" from "service_role";

revoke update on table "public"."mock_users" from "service_role";

alter table "public"."mock_users" drop constraint "mock_users_uuid_key";

alter table "public"."mock_users" drop constraint "mock_users_pkey";

drop index if exists "public"."mock_users_pkey";

drop index if exists "public"."mock_users_uuid_key";

drop table "public"."mock_users";

