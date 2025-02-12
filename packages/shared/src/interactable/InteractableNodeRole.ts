export enum InteractableNodeRole {
  // node types
  DOCUMENT = 'document',
  DOCUMENT_TYPE = 'document-type',
  CDATA = 'c-data',
  COMMENT = 'comment',

  // elements - containers
  SECTION = 'section',
  NAVIGATION = 'navigation',
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  TEXT = 'text',
  LIST = 'list',
  HEADER = 'header',
  FOOTER = 'footer',
  DIALOG = 'dialog',
  TEMPLATE = 'template',

  // elements - interactive
  LINK = 'link',
  BUTTON = 'button',
  INPUT = 'input',
  LABEL = 'label',
  FORM = 'form',

  // elements - media
  IMAGE = 'image',
  SVG = 'svg',
  IFRAME = 'iframe',
  AUDIO = 'audio',
  VIDEO = 'video',
  VIDEO_SOURCE = 'video-source',
  MAP = 'map',
  MAP_AREA = 'map-area',
  CANVAS = 'canvas',

  // attributes
  META = 'meta',
  TITLE = 'title',

  // other
  UNKNOWN = 'unknown',
}

const RoleToTagSetMap: { [key in InteractableNodeRole]: Set<string> } = {
  // node types
  [InteractableNodeRole.CDATA]: new Set(['c-data']),
  [InteractableNodeRole.COMMENT]: new Set(['comment']),
  [InteractableNodeRole.DOCUMENT]: new Set(['html']),
  [InteractableNodeRole.DOCUMENT_TYPE]: new Set(['!doctype']),

  // containers
  [InteractableNodeRole.SECTION]: new Set([
    'body',
    'details',
    'div',
    'head',
    'html',
    'main',
    'section',
    'span',
    'summary',
  ]),
  [InteractableNodeRole.NAVIGATION]: new Set(['menu', 'nav', 'ul']),
  [InteractableNodeRole.LIST]: new Set([
    'caption',
    'col',
    'colgroup',
    'li',
    'ol',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
  ]),
  [InteractableNodeRole.HEADER]: new Set(['header']),
  [InteractableNodeRole.FOOTER]: new Set(['footer']),
  [InteractableNodeRole.DIALOG]: new Set(['dialog']),
  [InteractableNodeRole.TEMPLATE]: new Set(['template']),

  // text
  [InteractableNodeRole.HEADING]: new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
  [InteractableNodeRole.PARAGRAPH]: new Set(['p']),
  [InteractableNodeRole.TEXT]: new Set([
    'abbr',
    'acronym',
    'address',
    'b',
    'bdi',
    'bdo',
    'big',
    'blockquote',
    'br', // TODO, line break - later translate to be text of `\n`
    'center',
    'cite',
    'code',
    'del',
    'dfn',
    'em',
    'figcaption',
    'font',
    'hr', // TODO, thematic break - later translate to be text of `\n-----\n`
    'i',
    'ins',
    'kbd',
    'mark',
    'math',
    'meter',
    'mfrac',
    'mi',
    'mmultiscripts',
    'mn',
    'mo',
    'mover',
    'mover',
    'mrow',
    'ms',
    'msub',
    'msub',
    'msubsup',
    'msubsup',
    'msup',
    'msup',
    'munder',
    'munder',
    'munderover',
    'nobr',
    'pre',
    'progress',
    'q',
    'resource',
    'rp',
    'rt',
    'ruby',
    's',
    'samp',
    'small',
    'strike',
    'strong',
    'sub',
    'sup',
    'text',
    'time',
    'tt',
    'u',
    'var',
    'wbr',
  ]),

  // interactive
  [InteractableNodeRole.LINK]: new Set(['a']),
  [InteractableNodeRole.BUTTON]: new Set(['button']),
  [InteractableNodeRole.INPUT]: new Set(['input', 'textarea']),
  [InteractableNodeRole.LABEL]: new Set(['label']),
  [InteractableNodeRole.FORM]: new Set(['form']),

  // media
  [InteractableNodeRole.IMAGE]: new Set(['img', 'picture', 'image']),
  [InteractableNodeRole.SVG]: new Set(['svg']),
  [InteractableNodeRole.IFRAME]: new Set(['iframe']),
  [InteractableNodeRole.AUDIO]: new Set(['audio']),
  [InteractableNodeRole.VIDEO]: new Set(['video']),
  [InteractableNodeRole.VIDEO_SOURCE]: new Set(['source']),
  [InteractableNodeRole.MAP]: new Set(['map']),
  [InteractableNodeRole.MAP_AREA]: new Set(['area']),
  [InteractableNodeRole.CANVAS]: new Set(['canvas']),

  // attributes
  [InteractableNodeRole.META]: new Set(['meta']),
  [InteractableNodeRole.TITLE]: new Set(['title']),

  // other
  [InteractableNodeRole.UNKNOWN]: new Set(),
};
const TagToRoleMap: { [key: string]: InteractableNodeRole } = Object.entries(RoleToTagSetMap).reduce(
  (acc, [role, tagSet]) => {
    for (const tag of tagSet) {
      acc[tag] = role as InteractableNodeRole;
    }
    return acc;
  },
  {} as { [key: string]: InteractableNodeRole },
);

export const getRoleFromTag = (tag: string): InteractableNodeRole => {
  if (!tag) return InteractableNodeRole.UNKNOWN;
  return TagToRoleMap[tag] || InteractableNodeRole.UNKNOWN;
};
