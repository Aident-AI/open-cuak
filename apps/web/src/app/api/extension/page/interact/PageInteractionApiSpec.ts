import { oneLine } from 'common-tags';
import { BaseEndpointApiSpec } from '~src/app/api/BaseEndpointApiSpec';
import { AllowedInteractPageApis } from '~src/app/api/extension/page/interact/[interaction]/registry';

export class PageInteractionApiSpec extends BaseEndpointApiSpec {
  public readonly apis = AllowedInteractPageApis;
  public readonly title = 'Aident Extension - Page Interaction APIs';
  public readonly version = '0.0.1';
  public readonly description = oneLine`
    A tool set to interact with the webpage in user's active browser tab through Aident Companion Extension. Through this
    tool set you can read content from the page and interact with it through supported actions.
  `;
}
