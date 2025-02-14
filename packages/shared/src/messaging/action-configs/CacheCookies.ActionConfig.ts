import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

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
    const userId = payload;
    const allCookies = await chrome.cookies.getAll({});

    // Group cookies by domain
    const cookiesByDomain = allCookies.reduce(
      (acc, cookie) => {
        const domain = cookie.domain;
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(cookie);
        return acc;
      },
      {} as Record<string, chrome.cookies.Cookie[]>,
    );

    const supabase = context.getSupabaseClient();

    // Upsert cookie groups by domain for the user.
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
