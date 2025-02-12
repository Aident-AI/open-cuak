import z from 'zod';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export const ServiceWorkerMessageSchema = z.object({
  receiver: z.literal(RuntimeMessageReceiver.SERVICE_WORKER).optional().default(RuntimeMessageReceiver.SERVICE_WORKER),
  action: z.nativeEnum(ServiceWorkerMessageAction),
  payload: z.any().optional(),
});
export type ServiceWorkerMessage = z.infer<typeof ServiceWorkerMessageSchema>;
