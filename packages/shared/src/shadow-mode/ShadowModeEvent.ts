import { EventType, IncrementalSource, MouseInteractions } from '@rrweb/types';
import { compare } from 'fast-json-patch';
import _ from 'lodash';
import { z } from 'zod';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { RRWebEvent } from '~shared/shadow-mode/RREvent';

export enum ShadowModeEventType {
  META = 'meta',
  PAGE_LOADING = 'page-loading',
  PAGE_LOADED = 'page-loaded',
  PAGE_UPDATED = 'page-updated',
  INTERACTION = 'interaction',
  COMMENT = 'comment',
}

export const ShadowModeEventMetaSchema = z
  .object({
    type: z.nativeEnum(ShadowModeEventType),
    subType: z.string().optional(),
    timestamp: z.number(),
    interaction: z.nativeEnum(InteractableInteraction).optional(),
    // delay: z.number().optional(), // TODO: check if this is needed
  })
  .passthrough();
export type ShadowModeEventMeta = z.infer<typeof ShadowModeEventMetaSchema>;

export class ShadowModeEvent {
  public static buildFromRREvent(
    e: RRWebEvent,
    it: InteractableObject.TreeNode,
    prev?: ShadowModeEvent,
  ): ShadowModeEvent | undefined {
    const event = _.cloneDeep(e) as any;
    switch (event.type) {
      case EventType.DomContentLoaded: {
        event.type = ShadowModeEventType.PAGE_LOADING;
        event.subType = 'dom-content-loaded';
        break;
      }
      case EventType.Load: {
        event.type = ShadowModeEventType.PAGE_LOADING;
        event.subType = 'complete-load';
        break;
      }
      case EventType.FullSnapshot: {
        event.type = ShadowModeEventType.PAGE_LOADED;
        event.subType = ShadowModeEventType.PAGE_LOADED;
        delete event.data;
        break;
      }
      case EventType.IncrementalSnapshot: {
        switch (event.data.source) {
          case IncrementalSource.Mutation: {
            event.type = ShadowModeEventType.PAGE_UPDATED;
            delete event.data;
            break;
          }
          case IncrementalSource.StyleSheetRule:
          case IncrementalSource.CanvasMutation:
          case IncrementalSource.Font:
          case IncrementalSource.Log:
          case IncrementalSource.StyleDeclaration:
          case IncrementalSource.AdoptedStyleSheet: {
            event.type = ShadowModeEventType.PAGE_UPDATED;
            break;
          }
          case IncrementalSource.MouseMove: {
            event.type = ShadowModeEventType.INTERACTION;
            event.subType = 'mouse-move';
            break;
          }
          case IncrementalSource.MouseInteraction: {
            event.type = ShadowModeEventType.INTERACTION;
            switch (event.data.type as MouseInteractions) {
              case MouseInteractions.MouseUp:
              case MouseInteractions.MouseDown:
                return undefined; // ignore mouse up/down events
              case MouseInteractions.Click: {
                event.interaction = InteractableInteraction.CLICK;
                break;
              }
              case MouseInteractions.ContextMenu: {
                event.subType = 'context-menu';
                break;
              }
              case MouseInteractions.DblClick: {
                event.subType = 'double-click';
                break;
              }
              case MouseInteractions.Focus: {
                event.interaction = InteractableInteraction.FOCUS;
                break;
              }
              case MouseInteractions.Blur: {
                event.subType = 'blur';
                break;
              }
              case MouseInteractions.TouchStart: {
                event.subType = 'touch-start';
                break;
              }
              case MouseInteractions.TouchMove_Departed: {
                event.subType = 'touch-move-departed';
                break;
              }
              case MouseInteractions.TouchEnd: {
                event.subType = 'touch-end';
                break;
              }
              case MouseInteractions.TouchCancel: {
                event.subType = 'touch-cancel';
                break;
              }
              default:
                throw new Error(`Unsupported mouse interaction: ${event.data.type}`);
            }
            delete event.data.type;
            break;
          }
          case IncrementalSource.Scroll: {
            event.type = ShadowModeEventType.INTERACTION;
            event.interaction = InteractableInteraction.SCROLL;
            break;
          }
          case IncrementalSource.ViewportResize: {
            return undefined; // Ignore window resizing, not an important event.
          }
          case IncrementalSource.Input: {
            event.type = ShadowModeEventType.INTERACTION;
            event.interaction = InteractableInteraction.TYPE;
            break;
          }
          case IncrementalSource.TouchMove: {
            event.type = ShadowModeEventType.INTERACTION;
            event.subType = 'touch-move';
            break;
          }
          case IncrementalSource.MediaInteraction: {
            event.type = ShadowModeEventType.INTERACTION;
            event.subType = 'media-interaction';
            break;
          }
          case IncrementalSource.Drag: {
            event.type = ShadowModeEventType.INTERACTION;
            event.subType = 'drag';
            break;
          }
          case IncrementalSource.Selection: {
            event.type = ShadowModeEventType.INTERACTION;
            event.subType = 'select';
            break;
          }
          default:
            throw new Error(`Unsupported incremental snapshot source: ${event.data.source}`);
        }

        delete event.data?.source;
        break;
      }
      case EventType.Meta: {
        event.type = ShadowModeEventType.META;
        break;
      }
      case EventType.Custom:
      case EventType.Plugin: {
        return undefined; // ignore for now
      }
      default:
        throw new Error(`Unsupported event type: ${event.type}`);
    }

    if (!event.data) return;
    for (const key in event.data) {
      if (event[key]) throw new Error(`Event data key conflict: ${key}. event=${JSON.stringify(event)}`);
      event[key] = event.data[key];
    }
    delete event.data;

    const meta = ShadowModeEventMetaSchema.parse(event);
    return new ShadowModeEvent(meta, it, prev);
  }

  private constructor(meta: ShadowModeEventMeta, it: InteractableObject.TreeNode, prev?: ShadowModeEvent) {
    this.data = meta;
    this.interactable = it;
    this.prev = prev;
  }

  public readonly data: ShadowModeEventMeta;
  public readonly interactable: InteractableObject.TreeNode;
  public readonly prev: ShadowModeEvent | undefined;

  public get type(): ShadowModeEventType {
    return this.data.type;
  }

  public get subType(): string | undefined {
    return this.data.subType;
  }

  public get timestamp(): number {
    return this.data.timestamp;
  }

  public get interaction(): InteractableInteraction | undefined {
    return this.data.interaction;
  }

  // TODO: make the tree patch a separate class
  public get treePatch(): object | undefined {
    if (!this.prev) return undefined;

    const diff = compare(this.prev.interactable, it);
    const patch = diff.map((d) => {
      if (!d.path) return d;

      const path = d.path.split('/');
      let parent: any;
      let pt = (d.op === 'add' ? it : this.prev) as any;
      let i: number;
      for (i = 1; i < path.length; i++) {
        const field = path[i];
        if (field === 'children') {
          parent = pt;
          pt = pt[field];
        } else if (Array.isArray(pt)) {
          parent = pt;
          pt = pt[parseInt(field, 10)];
        } else break;
      }
      const targetId = pt?.id ?? parent?.id;
      const remainingPathIndex = pt?.id ? i : i - 1;
      if (!targetId || remainingPathIndex < 0) throw new Error('Invalid path');

      const remainingPath = i && i < path.length ? path.slice(remainingPathIndex).join('/') : undefined;
      return { ...d, path: undefined, targetId, field: remainingPath };
    });

    return patch; // TODO: calculate patch size - if it's larger than tree itself, use tree instead
  }

  public toJSON(): object {
    return this.data;
  }
}
