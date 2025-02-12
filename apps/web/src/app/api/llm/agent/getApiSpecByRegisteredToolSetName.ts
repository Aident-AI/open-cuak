import { RegisteredToolSetName } from '~shared/agent/RegisteredToolSetName';
import { BaseEndpointApiSpec } from '~src/app/api/BaseEndpointApiSpec';
import { ExtensionApiSpec } from '~src/app/api/extension/ExtensionApiSpec';
import { VisionBasedBrowserControlApiSpec } from '~src/app/api/extension/VisionBasedBrowserControlApiSpec';
import { PortalBrowserControlApiSpec } from '~src/app/api/portal/PortalBrowserControlApiSpec';

export function getApiSpecByRegisteredToolSetName(toolset: RegisteredToolSetName): BaseEndpointApiSpec {
  switch (toolset) {
    case RegisteredToolSetName.BROWSER_CONTROL_VISION_BASED:
      return new VisionBasedBrowserControlApiSpec();
    case RegisteredToolSetName.BROWSER_INTERACTION:
      return new ExtensionApiSpec();
    case RegisteredToolSetName.PORTAL_BROWSER_CONTROL:
      return new PortalBrowserControlApiSpec();
    default:
      throw new Error(`Toolset ${toolset} is not supported.`);
  }
}
