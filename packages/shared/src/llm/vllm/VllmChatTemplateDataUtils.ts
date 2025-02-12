import { CoreMessage } from 'ai';
import { AiToolCall, AiToolCallSchema } from '~shared/agent/AiToolCallSchema';
import { ShareGPTData } from '~shared/data/ShareGPTDataSchema';
import {
  VllmChatTemplateAssistantMessage,
  VllmChatTemplateData,
  VllmChatTemplateMessage,
  VllmChatTemplateMessageImageContent,
  VllmChatTemplateMessageTextContent,
  VllmChatTemplateSystemMessage,
  VllmChatTemplateToolMessage,
  VllmChatTemplateUserMessageContent,
} from '~shared/llm/vllm/VllmChatTemplateMessage';

export class VllmChatTemplateDataUtils {
  public static convertCoreMessageToVllmChatTemplateMessage(message: CoreMessage): VllmChatTemplateMessage {
    switch (message.role) {
      case 'system': {
        return { role: 'system', content: message.content };
      }
      case 'user': {
        if (typeof message.content === 'string') return { role: 'user', content: message.content };
        if (!Array.isArray(message.content))
          throw new Error('Invalid content type for user message - non-string and non-array');

        const content = message.content
          .map((content) => {
            switch (content.type) {
              case 'text': {
                if (content.text.length < 1) return null;
                return { type: 'text', text: content.text } as VllmChatTemplateMessageTextContent;
              }
              case 'image': {
                const imageStr = content.image.toString();
                const isUrl = imageStr.startsWith('http');
                if (isUrl) return { type: 'image', image_url: imageStr } as VllmChatTemplateMessageImageContent;
                else return { type: 'image', image: imageStr } as VllmChatTemplateMessageImageContent;
              }
              case 'file':
              default:
                throw new Error(`Unsupported content type: ${content.type}`);
            }
          })
          .filter((content) => content !== null) as VllmChatTemplateMessageTextContent[];

        return { role: 'user', content };
      }
      case 'assistant': {
        if (typeof message.content === 'string') {
          return { role: 'assistant', content: message.content };
        }

        const toolCalls = [] as AiToolCall[];
        const content = message.content
          .map((content) => {
            switch (content.type) {
              case 'text': {
                if (content.text.length < 1) return null;
                return { type: 'text', text: content.text };
              }
              case 'tool-call': {
                toolCalls.push({ name: content.toolName, arguments: content.args });
                return null;
              }
            }
          })
          .filter((content) => content !== null) as VllmChatTemplateMessageTextContent[];
        if (content.length < 1 && toolCalls.length < 1)
          throw new Error('Invalid assistant message: no content and no tool calls');
        if (content.length < 1) return { role: 'assistant', tool_calls: toolCalls };
        if (toolCalls.length < 1) return { role: 'assistant', content };
        return { role: 'assistant', content, tool_calls: toolCalls };
      }
      case 'tool': {
        if (message.content.length < 0) throw new Error('Invalid tool message content (empty)');
        if (message.content.length > 1) throw new Error('Invalid tool message content (too many items)');
        const toolResult = message.content[0];
        if (toolResult.type !== 'tool-result') throw new Error('Invalid tool message content type: ' + toolResult.type);
        return { role: 'tool', content: toolResult.result as string };
      }
    }
  }

  public static convertCoreMessagesToVllmChatTemplateMessages(messages: CoreMessage[]): VllmChatTemplateMessage[] {
    return messages.map((message) => VllmChatTemplateDataUtils.convertCoreMessageToVllmChatTemplateMessage(message));
  }

  public static convertShareGPTDataToVllmChatTemplateData(
    data: ShareGPTData,
    targetModelName: string = 'Qwen/Qwen2-7B-Instruct',
    imagePad: string = '<image>',
  ): VllmChatTemplateData {
    const { conversations, tools, images } = data;
    const messages = [] as VllmChatTemplateMessage[];

    let imageIndex = 0;
    for (const message of conversations) {
      switch (message.role) {
        case 'system': {
          messages.push({ role: 'system', content: message.content } as VllmChatTemplateSystemMessage);
          break;
        }
        case 'user': {
          const content = [] as VllmChatTemplateUserMessageContent[];
          message.content
            .split(imagePad) // TODO: support video later
            .map((c) => c.trim())
            .forEach((text, i) => {
              if (i > 0) {
                const image = images?.[imageIndex];
                if (!image) throw new Error('Image not found for index ' + imageIndex);

                const isUrl = image.startsWith('http://') || image.startsWith('https://');
                if (isUrl) content.push({ type: 'image', image_url: image });
                else content.push({ type: 'image', image });
                imageIndex++;
              }
              if (text.length > 0) content.push({ type: 'text', text });
            });
          messages.push({ role: 'user', content });
          break;
        }
        case 'assistant': {
          messages.push({ role: 'assistant', content: message.content } as VllmChatTemplateAssistantMessage);
          break;
        }
        case 'tool_call': {
          messages.push({
            role: 'assistant',
            tool_calls: [AiToolCallSchema.parse(JSON.parse(message.content))],
          } as VllmChatTemplateAssistantMessage);
          break;
        }
        case 'tool_response': {
          messages.push({ role: 'tool', content: message.content } as VllmChatTemplateToolMessage);
          break;
        }
      }
    }

    const parsedTools = JSON.parse(tools);
    return { model: targetModelName, messages, tools: parsedTools } as VllmChatTemplateData;
  }
}
