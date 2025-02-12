import { getEncoding, Tiktoken } from 'js-tiktoken';

export class TokenizerUtils {
  public static encodeToTokens(str: string): number[] {
    const encoder = this.getEncoder();
    return encoder.encode(str);
  }

  public static countTokens(str: string): number {
    return this.encodeToTokens(str).length;
  }

  public static decodeFromTokens(tokens: number[]): string {
    return this.getEncoder().decode(tokens);
  }

  public static getEncoder(): Tiktoken {
    // TODO: figure out how to dynamically load `llama-tokenizer-js` for commonjs. for now, use tiktoken for estimation
    if (!this.#tokenizerInstance) this.#tokenizerInstance = getEncoding('gpt2');
    return this.#tokenizerInstance;
  }

  static #tokenizerInstance: Tiktoken;
}
