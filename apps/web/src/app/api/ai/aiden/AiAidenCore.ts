import { CoreMessage, CoreTool, CoreUserMessage, ImagePart, TextPart, tool } from 'ai';
import { z } from 'zod';
import {
  DEFAULT_MAX_STEPS,
  DefaultAiFinishRunTool,
  DefaultAiFinishRunToolName,
  ThinkAndPlanTool,
  ThinkAndPlanToolName,
} from '~shared/agent/AiAgentNode';
import {
  AiAidenBenchmarkSystemPrompt,
  AiAidenBoundingBoxCoordinatesSystemPrompt,
  AiAidenBrowserConnectedSystemPrompt,
  AiAidenBrowserDisconnectedSystemPrompt,
  AiAidenCrossSystemPrompt,
  AiAidenReActSystemPrompt,
} from '~shared/agent/AiAidenConfigBasedPrompts';
import { AiAidenSystemPromptVersion, AiAidenSystemPrompts } from '~shared/agent/AiAidenSystemPrompts';
import { RegisteredToolSetName } from '~shared/agent/RegisteredToolSetName';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { FetchCurrentCursorType_ActionConfig } from '~shared/messaging/action-configs/FetchCurrentCursorType.ActionConfig';
import { Screenshot_ActionConfig } from '~shared/messaging/action-configs/page-actions/Screenshot.ActionConfig';
import { PageScreenshotAction } from '~shared/messaging/action-configs/page-actions/types';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage, RuntimeMessageResponse } from '~shared/messaging/types';
import { AiAidenApiMessageAnnotation } from '~src/app/api/ai/aiden/AiAidenApi';
import { AiRegisteredToolSet } from '~src/app/api/llm/agent/AiRegisteredToolSet';

export interface AiAidenCoreConfig {
  baseMaxSteps: number;
  isBenchmark: boolean;
  isClaude: boolean;
  remoteBrowserConnected: boolean;
  remoteBrowserSessionId: string | undefined;
  sendRuntimeMessage: (message: RuntimeMessage) => Promise<RuntimeMessageResponse>;
  systemPromptVersion: AiAidenSystemPromptVersion;
  useCross: boolean;
  useInteractableTree: boolean;
  useReAct: boolean;
  userId: string;
}

export const DefaultAiAidenCoreConfigPart = {
  baseMaxSteps: DEFAULT_MAX_STEPS,
  isBenchmark: false,
  remoteBrowserConnected: true,
  // remoteBrowserSessionId,
  // sendRuntimeMessage,
  systemPromptVersion: AiAidenSystemPromptVersion.V4,
  useCross: false,
  useInteractableTree: false,
  useReAct: false,
  // user,
} as Partial<AiAidenCoreConfig>;

export const DEFAULT_AGENT_STEP_HISTORY_DEPTH = 3;
export const SERVICE_ROLE_USER_ID = 'service-role';

/** @deprecated */
export const DefaultReadScreenToolName = 'read-screen';
/** @deprecated */
export const DefaultReadScreenToolConfigs = {
  description:
    'Read the current screen and return the screenshot of the active tab and some helpful info. This tool is used to fetch the current screen state.',
  parameters: z.object({}).describe('No parameters required for this tool. Use an empty object `{}` as the input.'),
  execute: async () => {
    throw new Error('Not implemented');
  },
};
/** @deprecated */
export const DefaultReadScreenTool = tool(DefaultReadScreenToolConfigs) as CoreTool;

export class AiAidenCore {
  public static async genMessageAnnotation(config: AiAidenCoreConfig): Promise<AiAidenApiMessageAnnotation> {
    const anno = {} as Partial<AiAidenApiMessageAnnotation>;

    // fetch screenshot
    const screenshotConfig = {
      withCursor: true,
      useCross: config.useCross,
    };
    const response = await config.sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.SCREENSHOT,
      payload: { action: PageScreenshotAction.SCREENSHOT, config: screenshotConfig },
    });
    if (!response || !response.success) throw new Error('Failed to send runtime message to extension.');
    const { base64, boundingBoxCoordinates } = Screenshot_ActionConfig.responsePayloadSchema.parse(response.data);
    if (!base64) throw new Error('Failed to fetch screenshot.');
    if (!boundingBoxCoordinates) throw new Error('Failed to fetch bounding box coordinates.');
    anno.boundingBoxCoordinates = boundingBoxCoordinates;
    anno.beforeStateBase64 = 'data:image/png;base64,' + base64;

    // fetch mouse cursor type
    const cursorTypeResponse = await config.sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.CURRENT_CURSOR_TYPE,
    });
    if (!cursorTypeResponse || !cursorTypeResponse.success) throw new Error('Failed to fetch cursor type.');
    const { type, position } = FetchCurrentCursorType_ActionConfig.responsePayloadSchema.parse(cursorTypeResponse.data);
    anno.cursorType = type;
    anno.cursorPosition = position;

    return { ts: Date.now(), ...anno } as AiAidenApiMessageAnnotation;
  }

  public static async genTestRemoteBrowserConnection(config: {
    remoteBrowserSessionId: string | undefined;
    sendRuntimeMessage: (message: RuntimeMessage) => Promise<RuntimeMessageResponse>;
  }): Promise<boolean> {
    if (!config.remoteBrowserSessionId) return false;

    const response = await config.sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.PING,
    });
    return response?.success;
  }

  public static getSystemPrompts(config: AiAidenCoreConfig): CoreMessage[] {
    const systemMessages = [] as CoreMessage[];
    systemMessages.push({
      role: 'system',
      content: AiAidenSystemPrompts.getPrompt(config.systemPromptVersion),
    } as CoreMessage);
    systemMessages.push({ role: 'system', content: AiAidenBoundingBoxCoordinatesSystemPrompt } as CoreMessage);

    if (config.useReAct) systemMessages.push({ role: 'system', content: AiAidenReActSystemPrompt } as CoreMessage);
    if (config.useCross) systemMessages.push({ role: 'system', content: AiAidenCrossSystemPrompt } as CoreMessage);
    if (config.isBenchmark)
      systemMessages.push({ role: 'system', content: AiAidenBenchmarkSystemPrompt } as CoreMessage);

    const browserConnectionPrompt = config.remoteBrowserConnected
      ? AiAidenBrowserConnectedSystemPrompt
      : AiAidenBrowserDisconnectedSystemPrompt;
    systemMessages.push({ role: 'system', content: browserConnectionPrompt });

    // TODO remove this hack by supporting multiple tools
    systemMessages.push({ role: 'system', content: 'ONLY use ONE tool at a time' });
    return systemMessages;
  }

  public static getToolDict(config: AiAidenCoreConfig): Record<string, CoreTool> {
    let toolDict = { [DefaultAiFinishRunToolName]: DefaultAiFinishRunTool } as Record<string, CoreTool>;

    if (config.remoteBrowserConnected) {
      // TODO: add the tool to attach to a remote browser session
      toolDict = {
        ...toolDict,
        ...AiRegisteredToolSet[RegisteredToolSetName.PORTAL_BROWSER_CONTROL],
      };
    }
    if (config.useReAct) toolDict[ThinkAndPlanToolName] = ThinkAndPlanTool;

    return toolDict;
  }

  public static prepareStepStateMessages(config: {
    annotation: AiAidenApiMessageAnnotation;
    type?: 'single' | 'round';
  }): CoreMessage[] {
    const { annotation, type } = config;
    const stepInfoType = type ?? 'round';
    const ts = new Date(annotation.ts).toLocaleString();

    const messages = [] as CoreMessage[];
    if (stepInfoType === 'round') messages.push({ role: 'assistant', content: `read screen @ ${ts}` });

    // prepare user message
    const userMessageContent = [] as (TextPart | ImagePart)[];
    const contentJson = {} as Record<string, string | object>;
    const screenshotImage = annotation.beforeStateBase64;
    if (stepInfoType === 'single') contentJson['timestamp'] = ts;
    if (screenshotImage) {
      contentJson['screenshot'] = 'See the image.';
      userMessageContent.push({ type: 'image', image: screenshotImage });
    }
    contentJson['cursorType'] = annotation.cursorType;
    contentJson['cursorPosition'] = annotation.cursorPosition;
    if (annotation.boundingBoxCoordinates)
      contentJson['boundingBoxCoordinates'] = JSON.parse(annotation.boundingBoxCoordinates);
    userMessageContent.push({ type: 'text', text: JSON.stringify(contentJson) });
    messages.push({ role: 'user', content: userMessageContent } as CoreUserMessage);

    return messages;
  }
}

export class AiAidenCoreInstance {
  public async genStepStateMessages(config: AiAidenCoreConfig): Promise<CoreMessage[]> {
    // update step annotation
    if (!config.remoteBrowserSessionId) throw new Error('Remote browser session ID is not set');
    const lastStepAnnotation = await AiAidenCore.genMessageAnnotation(config);
    this.pushToStepStateHistory(lastStepAnnotation);

    const stateMessages = AiAidenCore.prepareStepStateMessages({ annotation: lastStepAnnotation });

    // add continue message between tool and user message for Claude model (ref: https://github.com/BerriAI/litellm/commit/52357a147cf3e75bd7ab45525789070b539b82ae#diff-39721500d7df0dd4c6aa7d60d7ef78a38afaf136f182114d15f4e3c1e863a413R2394)
    if (config.isClaude) stateMessages.unshift({ role: 'assistant', content: 'Continue' });
    return stateMessages;
  }

  public pushToStepStateHistory(anno: AiAidenApiMessageAnnotation) {
    this.lastStepAnnotation = anno;
    this.stepStateHistory.push(anno);
    while (this.stepStateHistory.length > this.stepHistorySize) this.stepStateHistory.shift();
  }

  constructor(stepHistorySize?: number) {
    this.stepHistorySize = stepHistorySize ?? DEFAULT_AGENT_STEP_HISTORY_DEPTH;
  }

  public readonly stepHistorySize: number;

  public lastStepAnnotation: AiAidenApiMessageAnnotation | undefined;
  public stepStateHistory: AiAidenApiMessageAnnotation[] = [];
}
