import { oneLine } from 'common-tags';
import { z } from 'zod';
import { ChromeTabSchema } from '~shared/chrome/Tab';
import { PaginationCursorSchema } from '~shared/cursor/types';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ReadScreen_ActionConfig } from '~shared/messaging/action-configs/page-actions/ReadScreen.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

// TODO: maxPageTokenSize is not properly implemented yet. disable it for now.
export class FetchFullPage_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.FETCH_FULL_PAGE;

  public static description = oneLine`
    Fetch an Interactable Node Tree for the whole page. It details the page's complete structure and content. Be CAREFUL
    to use this since some pages might be too large to fit into a single response. Set the max pageTokenSize to paginate
    the result. Use cursor to fetch paginated results.
  `;

  public static requestPayloadSchema = z
    .object({
      cursor: z.string().optional().describe(oneLine`
        The cursor to fetch paginated results. If not set, the first page will be fetched. The cursor is returned in the
        response when the tree is paginated. Default to undefined.
      `),
      // maxPageTokenSize: z.number().optional().nullable().describe(oneLine`
      //   The maximum size of the page token. If the page token is larger than this, it will be paginated. The default is
      //   10240. '-1' means no limit, but the page size should not be smaller than 500.
      // `), // TODO: make the prompt to be dynamic based on the LLM environment
    })
    .merge(ReadScreen_ActionConfig.requestPayloadSchema);

  public static responsePayloadSchema = z.object({
    tree: z.any().optional().describe(oneLine`
        The \`Interactable\` tree object of the page from the root node (page root if no root is set). This represents the
        structure and content of the page. Based on the config, some nodes may be collapsed and some attributes may be
        paginated to fit the response size.
      `),
    tabInfo: ChromeTabSchema.optional().describe(`The tab info of the current page.`),
    emptyReason: z.string().optional().describe(oneLine`
      If the tree is empty, this field will be set to the reason why it is empty.
    `),
    cursor: PaginationCursorSchema,
  });

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const it = context.getInteractableService().getInteractableOrThrow();
    const maxPageTokenSize = undefined; // TODO: implement maxPageTokenSize
    const { cursor, hideBoundingBoxes, includeTabInfo } = payload;
    const paginatedTree =
      cursor && cursor.length > 0
        ? await it.fetchPaginatedTreeByCursor(cursor)
        : await it.fetchPaginatedTree(maxPageTokenSize ?? undefined, hideBoundingBoxes, {
            ignoreFields: ['id', 'inView'],
          });
    if (!paginatedTree) throw new Error('Failed to fetch paginated tree');
    return includeTabInfo ? { ...paginatedTree, tabInfo: context.getActiveTab() } : { ...paginatedTree };
  }
}

enforceBaseActionConfigStatic(FetchFullPage_ActionConfig);
