import {
  AIMessage,
  AIMessageChunkFields,
  BaseMessage,
  BaseMessageChunk,
  ChatMessage,
  ChatMessageFieldsWithRole,
  FunctionMessage,
  FunctionMessageFieldsWithName,
  HumanMessage,
  StoredMessage,
  SystemMessage,
  ToolMessage,
  ToolMessageChunk,
  ToolMessageFieldsWithToolCallId,
  convertToChunk,
} from '@langchain/core/messages';
import { defaultToolCallParser } from '@langchain/core/messages/tool';
import _ from 'lodash';

export const convertBaseMessageToChunk = (message: BaseMessage): BaseMessageChunk => {
  if (message._getType() === 'tool') return message as ToolMessageChunk;
  return convertToChunk(message);
};

export const convertStoredMessageToChatMessage = (dict: StoredMessage): BaseMessage => {
  switch (dict.type) {
    case 'human':
      return new HumanMessage(dict.data);
    case 'ai': {
      // this is to bypass warning for no tool_calls field in AIMessageChunkFields
      // TODO: submit a PR to fix this to langchain
      const data = _.cloneDeep(dict.data) as AIMessageChunkFields;
      const rawToolCalls = data.additional_kwargs?.tool_calls;
      const shouldParseToolCalls = rawToolCalls && rawToolCalls.length > 0;
      if (shouldParseToolCalls) {
        const [toolCalls, invalidToolCalls] = defaultToolCallParser(rawToolCalls);
        data.tool_calls = toolCalls ?? [];
        data.invalid_tool_calls = invalidToolCalls ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.additional_kwargs as any)!.tool_calls = [];
      }

      const message = new AIMessage(data);
      if (shouldParseToolCalls) message.additional_kwargs.tool_calls = rawToolCalls;
      return message;
    }
    case 'system':
      return new SystemMessage(dict.data);
    case 'function':
      if (dict.data.name === undefined) throw new Error('Name must be defined for function messages');
      return new FunctionMessage(dict.data as FunctionMessageFieldsWithName);
    case 'tool':
      if (dict.data.tool_call_id === undefined) throw new Error('Tool call ID must be defined for tool messages');
      return new ToolMessage(dict.data as ToolMessageFieldsWithToolCallId);
    case 'generic': {
      if (dict.data.role === undefined) throw new Error('Role must be defined for chat messages');
      return new ChatMessage(dict.data as ChatMessageFieldsWithRole);
    }
    default:
      throw new Error(`Got unexpected type: ${dict.type}`);
  }
};

export const convertBaseMessageToStoredMessage = (message: BaseMessage): StoredMessage => message.toDict();
