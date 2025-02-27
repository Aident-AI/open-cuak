export enum LlmRouterModel {
  AZURE_OAI = 'azure-oai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  OPEN_AI = 'openai',
  OPEN_AI_COMPATIBLE = 'openai-compatible',
  VLLM = 'vllm',
}

export const LlmRouterModelHumanReadableName: Record<LlmRouterModel, string> = {
  [LlmRouterModel.AZURE_OAI]: 'Azure OpenAI',
  [LlmRouterModel.CLAUDE]: 'Claude',
  [LlmRouterModel.GEMINI]: 'Gemini',
  [LlmRouterModel.OPEN_AI]: 'OpenAI',
  [LlmRouterModel.OPEN_AI_COMPATIBLE]: 'OpenAI API Compatible',
  [LlmRouterModel.VLLM]: 'VLLM',
};

export enum ClaudeVariant {
  HAIKU_3_5 = 'anthropic.claude-3-5-haiku-20241022-v1:0',
  SONNET_3_5_AWS = 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  SONNET_3_5_GCP = 'claude-3-5-sonnet-v2@20241022',
}

export enum GeminiVariant {
  FLASH_1_5 = 'gemini-1.5-flash',
  PRO_1_5 = 'gemini-1.5-pro',
  FLASH_2_0 = 'gemini-2.0-flash-exp',
}

export enum GPTVariant {
  GPT_4O = 'gpt-4o',
}
