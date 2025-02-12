import z from 'zod';
import { isDevelopment } from '~shared/env/environment';

export enum AppSetting {
  DEBUG_MODE = 'debug-mode',
  INFERENCE_SERVER = 'inference-server',
  INTERACTABLE_NODE_INDICATOR = 'interactable-node-indicator',
  POLLING_INTERVAL_IN_MS = 'polling-interval-in-ms',
}

export enum InferenceServer {
  CLAUDE_HAIKU_3_5 = 'claude-3.5-haiku',
  CLAUDE_SONNET_3_5_AWS = 'claude-3.5-sonnet-aws',
  CLAUDE_SONNET_3_5_GCP = 'claude-3.5-sonnet-gcp',
  CLOUD = 'cloud',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  GEMINI_1_5_PRO = 'gemini-1.5-pro',
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GPT_4O_EAST = 'gpt-4o-east',
  GPT_4O_WEST = 'gpt-4o-west',
  GPT_4O_MINI = 'gpt-4o-mini',
  LOCAL = 'local',
}

export const AppSettingsSchema = z.object({
  [AppSetting.DEBUG_MODE]: z.boolean().optional().default(isDevelopment()),
  [AppSetting.INFERENCE_SERVER]: z.nativeEnum(InferenceServer).optional().default(InferenceServer.CLOUD),
  [AppSetting.INTERACTABLE_NODE_INDICATOR]: z.boolean().optional().default(false),
  [AppSetting.POLLING_INTERVAL_IN_MS]: z.number().optional().default(100),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;
