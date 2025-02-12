alter table "public"."remote_browser_cookies" add column "domain" text not null default ''::text;

CREATE UNIQUE INDEX remote_browser_cookies_user_id_domain_key ON public.remote_browser_cookies USING btree (user_id, domain);

alter table "public"."remote_browser_cookies" add constraint "remote_browser_cookies_user_id_domain_key" UNIQUE using index "remote_browser_cookies_user_id_domain_key";


