import { z } from 'zod';

export const OmniParserBoundingBoxSchema = z.object({
  type: z.string(),
  bbox: z.array(z.number()),
  interactivity: z.boolean(),
  content: z.string(),
  source: z.string(),
});
export type OmniParserBoundingBox = z.infer<typeof OmniParserBoundingBoxSchema>;

export const OmniParserResponseSchema = z.object({
  base64: z.string(),
  boundingBoxes: OmniParserBoundingBoxSchema.array(),
  latency: z.number(),
});
export type OmniParserResponse = z.infer<typeof OmniParserResponseSchema>;

export class OmniParserService {
  constructor(private readonly omniparserHost: string) {}

  public async genPing(): Promise<boolean> {
    const ping = await fetch(`${this.omniparserHost}/probe/`);
    if (!ping.ok) return false;

    const pingBody = await ping.json();
    if (pingBody.message !== 'Omniparser API ready') throw new Error('Omniparser server is down');
    return true;
  }

  public async genParseImage(base64Image: string): Promise<OmniParserResponse> {
    const response = await fetch(`${this.omniparserHost}/parse/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64_image: base64Image }),
    });
    if (!response.ok) throw new Error('Failed to parse image');

    const json = await response.json();
    return OmniParserResponseSchema.parse({
      base64: json.som_image_base64,
      boundingBoxes: json.parsed_content_list,
      latency: json.latency,
    });
  }
}
