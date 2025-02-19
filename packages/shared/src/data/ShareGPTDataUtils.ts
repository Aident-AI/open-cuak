import { CoreMessage, ImagePart, TextPart, ToolCallPart, ToolResultPart } from 'ai';
import { URL } from 'url';
import { AiToolCallSchema } from '~shared/agent/AiToolCallSchema';
import {
  ShareGPTData,
  ShareGPTDataSchema,
  ShareGPTMessage,
  ShareGPTMessageSchema,
} from '~shared/data/ShareGPTDataSchema';

export class ShareGPTDataUtils {
  public static convertCoreMessageToShareGPTMessages(message: CoreMessage): {
    messages: ShareGPTMessage[];
    images: string[];
  } {
    const imagePad = '<image>';
    switch (message.role) {
      case 'system': {
        const msg = ShareGPTMessageSchema.parse({ role: 'system', content: message.content });
        return { messages: [msg], images: [] };
      }
      case 'user': {
        if (typeof message.content === 'string') {
          const msg = ShareGPTMessageSchema.parse({ role: 'user', content: message.content });
          return { messages: [msg], images: [] };
        }

        const msg = { role: 'user', content: '' };
        const images = [] as string[];
        for (const content of message.content) {
          if (msg.content.length > 0) msg.content += '\n';
          switch (content.type) {
            case 'text': {
              msg.content += content.text;
              break;
            }
            case 'image': {
              msg.content += imagePad;
              images.push(content.image.toString()); // TODO: make sure this is the correct way to get the image url or image data string
              break;
            }
            case 'file':
              throw new Error('File type is not supported yet.');
          }
        }
        return { messages: [ShareGPTMessageSchema.parse(msg)], images };
      }
      case 'assistant': {
        if (typeof message.content === 'string') {
          const msg = ShareGPTMessageSchema.parse({ role: 'assistant', content: message.content });
          return { messages: [msg], images: [] };
        }

        const msg = { role: 'assistant', content: '' };
        const toolCalls = [] as ToolCallPart[];
        for (const content of message.content) {
          switch (content.type) {
            case 'text': {
              if (msg.content.length > 0) msg.content += '\n\n';
              msg.content += content.text;
              break;
            }
            case 'tool-call': {
              toolCalls.push(content);
              break;
            }
          }
        }

        const messages = [] as ShareGPTMessage[];
        if (msg.content.length > 0) messages.push(ShareGPTMessageSchema.parse(msg));
        if (toolCalls.length < 1) return { messages, images: [] };

        // TODO: implement parallel tool-call support
        if (toolCalls.length > 1) throw new Error('Parallel tool-call is not supported yet.');
        for (const toolCall of toolCalls) {
          const parsedToolCall = AiToolCallSchema.parse({ name: toolCall.toolName, arguments: toolCall.args });
          const toolCallMessage = { role: 'tool_call', content: JSON.stringify(parsedToolCall) };
          messages.push(ShareGPTMessageSchema.parse(toolCallMessage));
        }
        return { messages, images: [] };
      }
      case 'tool': {
        const messages = message.content.map((toolCall) =>
          ShareGPTMessageSchema.parse({ role: 'tool_response', content: toolCall.result }),
        );
        return { messages, images: [] };
      }
    }
  }

  public static convertCoreMessagesToShareGPTData(messages: CoreMessage[]): ShareGPTData {
    if (messages.length < 1) return ShareGPTDataSchema.parse({ conversations: [], tools: '', images: [] });

    const conversations = [] as ShareGPTMessage[];
    const images = [] as string[];
    for (const message of messages) {
      const { messages: msgs, images: imgs } = ShareGPTDataUtils.convertCoreMessageToShareGPTMessages(message);
      conversations.push(...msgs);
      images.push(...imgs);
    }
    return ShareGPTDataSchema.parse({ conversations, tools: '', images });
  }

  public static convertShareGPTDataToCoreMessages(data: ShareGPTData): CoreMessage[] {
    const { conversations, images } = data;
    const messages = [] as CoreMessage[];
    let imageIndex = 0;
    const imagePad = '<image>';
    for (const message of conversations) {
      switch (message.role) {
        case 'system':
        case 'assistant': {
          messages.push({ role: message.role, content: message.content });
          break;
        }
        case 'user': {
          const contents = message.content.split(imagePad).map((c) => c.trim());
          const userMessage = { role: 'user', content: [] as (ImagePart | TextPart)[] };
          for (let i = 1; i < contents.length; i++) {
            const image = images?.[imageIndex];
            if (!image) throw new Error('Image not found.');
            userMessage.content.push({ type: 'image', image: new URL(image) } as ImagePart);
            imageIndex++;
            userMessage.content.push({ type: 'text', text: contents[i] });
          }
          break;
        }
        case 'tool_call': {
          const toolCall = AiToolCallSchema.parse(JSON.parse(message.content));
          const toolCallPart = { type: 'tool-call', toolName: toolCall.name, args: toolCall.arguments } as ToolCallPart;
          messages.push({ role: 'assistant', content: [toolCallPart] });
          break;
        }
        case 'tool_response': {
          const toolCallMessage = messages[messages.length - 1];
          if (toolCallMessage.role !== 'assistant')
            throw new Error('Last message is not a tool call when parsing a tool response.');
          if (toolCallMessage.content.length < 1) throw new Error('Tool call message is empty.');
          if (toolCallMessage.content.length > 1) throw new Error('Parallel tool-call is not supported yet.');
          const toolCall = toolCallMessage.content[0] as ToolCallPart;

          const toolResult = {
            ...toolCall,
            ...{ type: 'tool-result', result: JSON.parse(message.content) },
          } as ToolResultPart;
          messages.push({ role: 'tool', content: [toolResult] });
          break;
        }
      }
    }
    return messages;
  }
}
