import { nanoid } from 'nanoid';
import { serializedNodeWithId, snapshot } from 'rrweb-snapshot';
import { SNAPSHOT_NANOID_ATTRIBUTE_KEY } from '~shared/interactable/types';

export class RRSnapshot {
  public static buildFullPageSnapshot(doc: Document): serializedNodeWithId | undefined {
    if (!doc) throw new Error('Document is not available');

    const dom = snapshot(doc, {
      slimDOM: {
        script: true,
        comment: true,
        headFavicon: true,
        headWhitespace: true,
        headMetaDescKeywords: false,
        headMetaSocial: false,
        headMetaRobots: false,
        headMetaHttpEquiv: false,
        headMetaAuthorship: false,
        headMetaVerification: false,
      },
      onNodeSerialized: (node, serialized) => {
        const nanoidFromAttr = serialized.attributes?.[SNAPSHOT_NANOID_ATTRIBUTE_KEY] ?? '';
        const hasNanoidAttr = nanoidFromAttr && typeof nanoidFromAttr === 'string' && nanoidFromAttr.length > 0;
        const nodeNanoid = hasNanoidAttr ? nanoidFromAttr : nanoid(8);
        serialized.nanoid = nodeNanoid;

        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const element = node as Element;
        if (nanoidFromAttr !== nodeNanoid) void element.setAttribute(SNAPSHOT_NANOID_ATTRIBUTE_KEY, serialized.nanoid);

        const rect = element.getBoundingClientRect();
        serialized.rect = rect;
        const style = window.getComputedStyle(element);
        const withinViewport =
          rect.top < window.innerHeight && rect.left < window.innerWidth && rect.bottom > 0 && rect.right > 0;
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          withinViewport;
        serialized.inView = isVisible;
      },
    });
    return dom ?? undefined;
  }
}
