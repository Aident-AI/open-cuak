import { ZodNull, z } from 'zod';
import {
  InteractableInteractionRegistry,
  InteractionConstructor,
} from '~shared/interactable/interactions/InteractableInteractionRegistry';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { TargetNodeIdSchema } from '~shared/messaging/action-configs/page-actions/mixins';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { EnumUtils } from '~shared/utils/EnumUtils';
import { BaseEndpointApi, EndpointConfigType } from '~src/app/api/BaseEndpointApi';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export class InteractPageByInteractionApi extends BaseEndpointApi {
  constructor(public readonly interaction: InteractableInteraction) {
    super();
  }

  public get EndpointConfig(): EndpointConfigType {
    return {
      path: '/api/extension/page/interact/' + this.interactionConfig.type,
      method: 'post',
      operationId: 'page:interact:' + this.interactionConfig.type,
      summary: this.interactionConfig.description,
    };
  }

  public get interactionConfig(): InteractionConstructor {
    const config = InteractableInteractionRegistry[this.interaction];
    if (!config) throw new Error('Invalid interaction value: ' + this.interaction);
    return config;
  }

  public get RequestSchema() {
    const targetNodeIdSchema = { targetNodeId: TargetNodeIdSchema };
    const config = this.interactionConfig.configSchema;
    const schema = config instanceof ZodNull ? z.object(targetNodeIdSchema) : config.extend(targetNodeIdSchema);
    return { required: true, schema };
  }

  public get ResponseSchema() {
    const successSchema = z.object({ success: z.literal(true) });
    const failureSchema = z.object({ success: z.literal(false), error: z.string() });
    return z.union([successSchema, failureSchema]);
  }

  public async exec(
    args: z.infer<typeof this.RequestSchema.schema>,
    params?: Record<string, unknown>,
  ): Promise<z.infer<typeof this.ResponseSchema>> {
    const interaction = params?.interaction;
    if (!interaction) throw new Error('Missing required parameter: interaction');
    const isInteraction = EnumUtils.isValidEnumValue(interaction as string, InteractableInteraction);
    if (!isInteraction) throw new Error('Invalid interaction value');

    const { sendRuntimeMessage } = ApiRequestContextService.getContext();
    const { targetNodeId, ...config } = args;
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.INTERACT_PAGE,
      payload: { interaction, targetNodeId, config },
    });
    if (!rsp.success) throw new Error(rsp.error);
    return rsp ?? { success: true };
  }

  public async ToolCalling(input: object): Promise<string> {
    const request = this.RequestSchema.schema.parse(input);
    const response = await this.exec(request, { interaction: this.interaction });
    return JSON.stringify(response);
  }
}
