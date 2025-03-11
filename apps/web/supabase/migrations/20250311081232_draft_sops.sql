alter table "public"."prebuilt_sops" add column "is_draft" boolean not null default true;

create policy "Enable all access for all users"
on "public"."prebuilt_sops"
as permissive
for all
to public
using (true);



