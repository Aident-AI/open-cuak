import { ZodVoid, z } from 'zod';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ActionConfigType } from '~shared/messaging/action-configs/registry';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ZodUtils } from '~shared/utils/ZodUtils';
import { BaseEndpointApi, EndpointConfigType } from '~src/app/api/BaseEndpointApi';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export abstract class ActionConfigBasedApi extends BaseEndpointApi {
  public abstract readonly actionConfig: ActionConfigType;
  public abstract readonly endpointPath: string;

  public readonly tagPrefix: string = '';

  public get EndpointConfig(): EndpointConfigType {
    return {
      path: this.endpointPath,
      method: 'post',
      operationId: this.tagPrefix + this.action,
      summary: this.actionConfig.description,
    };
  }

  public get action(): ServiceWorkerMessageAction {
    return this.actionConfig.action;
  }

  public get RequestSchema() {
    return { required: true, schema: this.actionConfig.requestPayloadSchema };
  }

  public get ResponseSchema() {
    const isVoid =
      this.actionConfig.responsePayloadSchema instanceof ZodVoid ||
      ZodUtils.isUndefined(this.actionConfig.responsePayloadSchema);
    const dataSchema = isVoid ? z.undefined() : this.actionConfig.responsePayloadSchema;
    const successSchema = z.object({ success: z.literal(true), data: dataSchema });
    const failureSchema = z.object({ success: z.literal(false), error: z.string() });
    return z.union([successSchema, failureSchema]);
  }

  public override async exec(
    args: z.infer<typeof this.RequestSchema.schema>,
  ): Promise<z.infer<typeof this.ResponseSchema>> {
    const { sendRuntimeMessage } = ApiRequestContextService.getContext();
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: this.action,
      payload: this.getPayload(args),
    });
    if (!rsp.success) throw new Error(rsp.error);
    return rsp.data ?? { success: true };
  }

  public getPayload(args: z.infer<typeof this.RequestSchema.schema>): z.infer<typeof this.RequestSchema.schema> {
    const removeEmptyFields = (obj: Record<string, unknown>) => {
      for (const key in obj) {
        if (obj[key] === null || obj[key] === undefined) delete obj[key];
        else if (typeof obj[key] === 'object') removeEmptyFields(obj[key] as Record<string, unknown>);
      }
    };
    removeEmptyFields(args as Record<string, unknown>);
    return this.RequestSchema.schema.parse(args);
  }
}
