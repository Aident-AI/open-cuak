import {
  CanvasContext,
  EventType,
  eventWithTime,
  IncrementalSource,
  MouseInteractions,
  PointerTypes,
} from '@rrweb/types';
import _ from 'lodash';
import { z } from 'zod';

export type RRWebEvent = eventWithTime & { uuid: string };

export const RREventSchema = z.object({}).passthrough();
export type RREvent = z.infer<typeof RREventSchema>;

// TODO: merge this with RRWebEvent which has uuid
export const RREventWithNanoIdSchema = z.object({ nanoId: z.string() }).merge(RREventSchema);
export type RREventWithNanoId = z.infer<typeof RREventWithNanoIdSchema>;

export class RREventParser {
  public static stringifyEvent(e: RRWebEvent): object {
    const event = _.cloneDeep(e) as any;
    if (event.type === EventType.FullSnapshot) event.data = undefined;

    // stringify enums
    if (event.type === EventType.IncrementalSnapshot) {
      const data = event.data;
      if (data.source === IncrementalSource.Mutation) event.data = undefined;
      if (data.source === IncrementalSource.MouseInteraction) {
        data.type = MouseInteractions[data.type];
        if (data.pointerType) data.pointerType = PointerTypes[data.pointerType];
      }
      if (data.source === IncrementalSource.CanvasMutation) {
        data.type = CanvasContext[data.type];
      }
      data.source = IncrementalSource[data.source];
    }
    event.type = EventType[event.type];

    return event;
  }
}
