import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RegisteredToolSetName } from '~shared/agent/RegisteredToolSetName';
import { ALogger } from '~shared/logging/ALogger';
import { ShadowModeWorkflowEnvironmentSchema } from '~shared/shadow-mode/ShadowModeWorkflowEnvironment';
import { AiAidenApiMessageAnnotationSchema } from '~src/app/api/ai/aiden/AiAidenApi';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';

const requestSchema = z.object({
  messages: z.array(z.any()).describe('The complete chat history messages for the workflow.'),
  annotationMap: z
    .record(z.string(), AiAidenApiMessageAnnotationSchema)
    .describe('The map of message id to AiAidenApiMessageAnnotation.'),
  startPosition: z.any().describe('The mouse cursor position at the start of the workflow.'),
  startUrl: z.string().url().describe('The URL of the page where the workflow starts.'),
});

export const POST = simpleRequestWrapper<z.infer<typeof requestSchema>>(
  requestSchema,
  { assertUserLoggedIn: true },
  async (request, context) => {
    const { messages, startPosition, startUrl, annotationMap } = request;
    const supabase = context.getSupabase();
    const user = await context.fetchUserOrThrow();

    const environment = ShadowModeWorkflowEnvironmentSchema.parse({
      startPosition,
      startUrl,
      viewport: undefined, // default viewport: { width: 1920, height: 1080 },
      toolset: RegisteredToolSetName.BROWSER_CONTROL_VISION_BASED,
    });

    const { error } = await supabase
      .from('shadow_mode_workflows')
      .insert([{ version: 0, contributor: user.id, messages, environment, annotation_map: annotationMap }]);
    if (error) {
      ALogger.error({ context: 'Failed to save workflow', error });
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  },
);
