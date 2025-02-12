import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class CacheCookies_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.CACHE_COOKIES;

  public static description = 'Cache cookies for the current tab for Bot Auth';

  public static requestPayloadSchema = z.string().optional();

  public static responsePayloadSchema = z.void();

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const tab = context.getActiveTab();
    if (!tab.url) throw new Error('No tab URL found');
    const userId = payload;
    const domain = new URL(tab.url).hostname;
    const cookies = await chrome.cookies.getAll({ domain });

    // This is for remote browser user sessions
    const supabase = context.getSupabaseClient();
    const { error } = await supabase.from('remote_browser_cookies').upsert({
      user_id: userId,
      domain,
      cookies,
    });
    if (error) throw error;
  }
}

enforceBaseActionConfigStatic(CacheCookies_ActionConfig);
