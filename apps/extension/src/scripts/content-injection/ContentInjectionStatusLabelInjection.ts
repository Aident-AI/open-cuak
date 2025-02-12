import { CONTENT_INJECTION_STATUS_LABEL_ID } from '~shared/injection/ContentInjectionStatusFetchingService';
import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { EnumUtils } from '~shared/utils/EnumUtils';

export class ContentInjectionStatusLabelInjection {
  public static init() {
    const statusDiv = document.createElement('div');
    statusDiv.innerText = TabLifecycleStatus.LOADING;
    statusDiv.id = CONTENT_INJECTION_STATUS_LABEL_ID;
    statusDiv.style.display = 'none';
    document.body.appendChild(statusDiv);
  }

  public static remove(): void {
    const div = this.getStatusDiv();
    if (div) document.body.removeChild(div);
  }

  public static update(status: TabLifecycleStatus): void {
    const div = this.getStatusDiv();
    if (div) div.innerText = status;
  }

  public static getStatus(): TabLifecycleStatus {
    const div = this.getStatusDiv();
    if (!div) return TabLifecycleStatus.UNLOADED;

    return EnumUtils.getEnumValue(TabLifecycleStatus, div.innerText) ?? TabLifecycleStatus.UNLOADED;
  }

  public static getStatusDiv() {
    return document.getElementById(CONTENT_INJECTION_STATUS_LABEL_ID);
  }
}
