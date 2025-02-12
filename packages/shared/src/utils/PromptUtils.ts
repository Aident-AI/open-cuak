export class PromptUtils {
  public static trimString(text: string) {
    return text.trim().replace(/[\r\n]+/g, '\n');
  }

  public static removeStopSequence(text: string, stopSequences: string[]): string {
    for (const item of stopSequences) {
      const truncated = item.substring(0, item.length - 1);
      if (text.endsWith(truncated)) return text.substring(0, text.length - truncated.length);
    }
    return text;
  }
}
