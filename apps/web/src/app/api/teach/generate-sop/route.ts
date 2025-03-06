import { CoreSystemMessage, CoreUserMessage, ImagePart, TextPart, generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GPTVariant, LlmRouterModel } from '~shared/llm/LlmRouterModel';
import { ModelRouter } from '~shared/llm/ModelRouter';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';
import { TeachAidenDataSchema } from '~src/app/portal/TeachAidentData';

const requestSchema = z.object({
  teachAidenDataMap: z.record(z.string().transform(Number), TeachAidenDataSchema),
});

export const POST = simpleRequestWrapper<z.infer<typeof requestSchema>>(
  requestSchema,
  { assertUserLoggedIn: true },
  async (request) => {
    const { teachAidenDataMap } = request;

    const model = await ModelRouter.genModel({ model: LlmRouterModel.AZURE_OAI, variant: GPTVariant.GPT_4O });
    const userMessageContent = [] as (TextPart | ImagePart)[];
    Object.entries(teachAidenDataMap).forEach(([ts, data]) => {
      userMessageContent.push({ type: 'text', text: `timestamp: ${ts}, event: ${data.event}, see the screenshot` });
      userMessageContent.push({ type: 'image', image: data.screenshot });
    });
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT } as CoreSystemMessage,
      { role: 'user', content: userMessageContent } as CoreUserMessage,
    ];
    const response = await generateText({
      model,
      messages,
    });

    return new NextResponse(JSON.stringify(response));
  },
);

const SYSTEM_PROMPT = `
  You will be given some data entries, these data entries represent users' actions on the browser to finish a workflow.
  Each data entry contains timestamp, event type and the screenshot of the browser when the event happens.
  Your job is to generate a SOP for the workflow.
  The SOP should be a list of steps, each step contains a description and the expected result.
  The SOP should be in the following format:
  [
    {
      "id": 1,
      "action": "Use Google to search for Arsenal",
      "expectedEndState": "A google search result page for Arsenal"
    },
    {
      "id": 2,
      "action": "Click on Matches",
      "description": "Check out Arsenal fixtures.",
      "expectedEndState": "A page showing Arsenal fixtures"
    },
    {
      "id": 3,
      "action": "List out the time for next 5 matches",
      "expectedEndState": "Inform users about the time of next 5 matches"
    }
  ]
`;
