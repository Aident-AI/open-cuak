import { z } from 'zod';
import { isStringConfigOn } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { parseDomain, fromUrl } from 'tldts';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class CacheCookies_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.CACHE_COOKIES;

  public static description = 'Cache cookies for the current browser session';

  public static requestPayloadSchema = z.string().optional();

  public static responsePayloadSchema = z.void();

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    if (!isStringConfigOn(process.env.NEXT_PUBLIC_AUTO_SAVE_COOKIES)) {
      ALogger.warn('NEXT_PUBLIC_AUTO_SAVE_COOKIES is set to false, skipping cookie caching');
      return;
    }

    const userId = payload;
    const allCookies = await chrome.cookies.getAll({});

    // Group cookies by effective domain (eTLD+1)
    const cookiesByDomain = allCookies.reduce(
      (acc, cookie) => {
        const domain = parseDomain(fromUrl(cookie.domain)).domain;
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(cookie);
        return acc;
      },
      {} as Record<string, chrome.cookies.Cookie[]>,
    );

    const supabase = context.getSupabaseClient();

    // Upsert cookie groups by effective domain for the user.
    for (const [domain, cookies] of Object.entries(cookiesByDomain)) {
      const { error } = await supabase.from('remote_browser_cookies').upsert({
        user_id: userId,
        domain,
        cookies,
      });
      if (error) throw error;
    }
  }
}

enforceBaseActionConfigStatic(CacheCookies_ActionConfig);
