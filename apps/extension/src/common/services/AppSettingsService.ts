import { AppSetting, AppSettings, AppSettingsSchema } from '~shared/app-settings/types';
import { BroadcastEventType } from '~shared/broadcast/types';
import { BroadcastService } from '~src/common/services/BroadcastService';

export class AppSettingsService {
  public static async start() {
    await this._instance._save();
  }

  public static subscribe<T>(key: AppSetting, callback: (value: T) => Promise<void> | void) {
    // TODO: migrate to persistent storage later
    BroadcastService.subscribe<AppSettings>(AppSettingsService.#event, async (newValue, oldValue) => {
      if (newValue[key] === (oldValue ?? {})[key]) return;
      await callback(newValue[key] as T);
    });
  }

  public static async fetch<T>(key: AppSetting): Promise<T> {
    await this._instance._fetch();
    return this.#defaultAppSettings[key] as T;
  }

  public static async set(key: AppSetting, value: unknown) {
    const newSettings = AppSettingsSchema.parse({ ...AppSettingsService.#defaultAppSettings, [key]: value });
    AppSettingsService.#defaultAppSettings = newSettings;
    await this._instance._save();
  }

  static #event = { type: BroadcastEventType.APP_SETTING_UPDATED };
  static #defaultAppSettings: AppSettings = AppSettingsSchema.parse({});
  static #instance: AppSettingsService;

  private static get _instance() {
    if (!AppSettingsService.#instance) AppSettingsService.#instance = new AppSettingsService();
    return AppSettingsService.#instance;
  }

  private async _fetch() {
    const settings = await BroadcastService.fetch<AppSettings>(AppSettingsService.#event);
    if (!settings) return;
    AppSettingsService.#defaultAppSettings = settings;
  }

  private async _save() {
    await BroadcastService.send<AppSettings>(AppSettingsService.#event, AppSettingsService.#defaultAppSettings);
  }
}
