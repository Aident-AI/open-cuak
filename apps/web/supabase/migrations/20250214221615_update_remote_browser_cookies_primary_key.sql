alter table "public"."remote_browser_cookies" drop constraint "remote_browser_cookies_id_key";

alter table "public"."remote_browser_cookies" drop constraint "remote_browser_cookies_pkey";

drop index if exists "public"."remote_browser_cookies_id_key";

drop index if exists "public"."remote_browser_cookies_pkey";

alter table "public"."remote_browser_cookies" drop column "id";

CREATE UNIQUE INDEX remote_browser_cookies_pkey ON public.remote_browser_cookies USING btree (user_id, domain);

alter table "public"."remote_browser_cookies" add constraint "remote_browser_cookies_pkey" PRIMARY KEY using index "remote_browser_cookies_pkey";


