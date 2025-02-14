import { createOpenAI } from '@ai-sdk/openai';
import { ChatOpenAI } from '@langchain/openai';
import { LanguageModel } from 'ai';

import type { OpenAIProvider } from '@ai-sdk/openai';

/**
 *  @deprecated Use `ModelRouter.OPEN_AI` instead.
 */
export class VllmServiceHost {
  public static getFetchBaseUrlOrThrow(): string {
    const url = process.env.VLLM_API_URL;
    if (!url) throw new Error('No API URL for VLLM server found');
    return url;
  }

  public static getFetchApiKey(): string {
    const apiKey = process.env.VLLM_API_KEY;
    if (!apiKey) throw new Error('No API key found');
    return apiKey;
  }

  public static getVisionModelName(): string {
    return 'ljhskyso/fine-tuned-qwen2-vl-merged-awq';
  }

  public static async getCreateOpenAILanguageModel(modelName?: string): Promise<LanguageModel> {
    const vllm = this.#genCreateProvider();
    return vllm(modelName ?? this.getVisionModelName());
  }

  public static getCreateChatOpenAIModel(): ChatOpenAI {
    const baseURL = this.getFetchBaseUrlOrThrow();
    const apiKey = this.getFetchApiKey();
    return new ChatOpenAI({ model: this.getVisionModelName(), configuration: { baseURL, apiKey } });
  }

  static #genCreateProvider(): OpenAIProvider {
    const baseURL = this.getFetchBaseUrlOrThrow();
    const apiKey = this.getFetchApiKey();
    return createOpenAI({ baseURL, apiKey, compatibility: 'compatible', name: 'vllm' });
  }
}
