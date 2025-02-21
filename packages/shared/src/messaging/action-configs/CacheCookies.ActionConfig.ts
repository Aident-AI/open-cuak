import { z } from 'zod';
import { ALogger } from '~shared/logging/ALogger';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { genFetchUserConfig } from '~shared/user-config/UserConfig';

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
    if (!userId) {
      throw new Error('No userId found in the payload');
    }
    const userConfig = await genFetchUserConfig(userId, context.getSupabaseClient());
    if (!userConfig.autoSaveAndApplyCookies) {
      ALogger.warn('autoSaveAndApplyCookies is set to false, skipping cookie caching');
      return;
    }

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
