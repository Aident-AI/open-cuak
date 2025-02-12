import { z } from 'zod';
import { WaitUtils } from '~shared/utils/WaitUtils';
import { BaseEndpointApi, EndpointConfigType } from '~src/app/api/BaseEndpointApi';

export class PortalWaitToolApi extends BaseEndpointApi {
  public readonly EndpointConfig = {
    path: '/api/portal/wait-tool',
    method: 'post',
    operationId: 'portal:wait-tool',
    summary:
      'Use this tool to wait for a short period of time, in order to wait for the page loading or other actions to complete.',
  } as const as EndpointConfigType;

  public readonly RequestSchema = {
    required: true,
    schema: z.object({
      duration: z
        .number()
        .describe('The duration to wait in milliseconds. Default to 1000ms.')
        .optional()
        .default(1000),
    }),
  };

  public readonly ResponseSchema = z.object({ wait: z.literal('complete') });

  public override async exec(
    request: z.infer<typeof this.RequestSchema.schema>,
  ): Promise<z.infer<typeof this.ResponseSchema>> {
    await WaitUtils.wait(request.duration);
    return this.ResponseSchema.parse({ wait: 'complete' });
  }
}
