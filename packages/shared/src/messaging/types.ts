/* eslint-disable @typescript-eslint/no-namespace */
import z from 'zod';
import { ActionConfigRegistry, ActionConfigType, getActionConfig } from '~shared/messaging/action-configs/registry';
import { ContentInjectionMessageSchema } from '~shared/messaging/content-injection/types';
import { SandboxMessageSchema } from '~shared/messaging/sandbox/types';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ServiceWorkerMessageSchema } from '~shared/messaging/service-worker/types';
import { SidePanelMessageSchema } from '~shared/messaging/side-panel/types';

export const RuntimeMessageSchema = ServiceWorkerMessageSchema.or(SidePanelMessageSchema)
  .or(ContentInjectionMessageSchema)
  .or(SandboxMessageSchema);
export type RuntimeMessage = z.infer<typeof RuntimeMessageSchema>;

export const RuntimeMessageResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.any().optional(),
  })
  .or(z.object({ success: z.literal(false), error: z.string() }));
export type RuntimeMessageResponse = z.infer<typeof RuntimeMessageResponseSchema>;

const requestPayloadSchemaDict = {} as Record<ServiceWorkerMessageAction, ActionConfigType['requestPayloadSchema']>;
Object.values(ServiceWorkerMessageAction).forEach((action) => {
  const schema = getActionConfig(action).requestPayloadSchema;
  if (!schema) throw new Error(`No request payload schema found for action: ${action}`);
  requestPayloadSchemaDict[action] = schema;
});

const responsePayloadSchemaDict = {} as Record<ServiceWorkerMessageAction, ActionConfigType['responsePayloadSchema']>;
Object.values(ServiceWorkerMessageAction).forEach((action) => {
  const schema = getActionConfig(action).responsePayloadSchema;
  if (!schema) throw new Error(`No request payload schema found for action: ${action}`);
  responsePayloadSchemaDict[action] = schema;
});

// TODO: move these to `ServiceWorkerMessageHandler` to include handler logics as well
export namespace RuntimeMessage {
  export namespace RequestPayload {
    export const Schema = requestPayloadSchemaDict;

    export type Type = {
      [K in ServiceWorkerMessageAction]: z.infer<(typeof ActionConfigRegistry)[K]['requestPayloadSchema']>;
    };
  }

  export namespace ResponsePayload {
    export const Schema = responsePayloadSchemaDict;

    export type Type = {
      [K in ServiceWorkerMessageAction]: z.infer<(typeof ActionConfigRegistry)[K]['responsePayloadSchema']>;
    };
  }
}

export enum RuntimeMessageError {
  TARGET_TAB_IS_CHROME_INTERNAL_PAGE = 'TARGET_TAB_IS_CHROME_INTERNAL_PAGE',
}
export const KnownRuntimeMessageErrors = new Set(
  Object.keys(RuntimeMessageError) as (keyof typeof RuntimeMessageError)[],
);
