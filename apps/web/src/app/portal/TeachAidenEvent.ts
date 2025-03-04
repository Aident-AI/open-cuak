type Position = { x: number; y: number };

export type ProcessedEventBase = {
  type: 'move' | 'click' | 'scroll' | 'key';
  ts: number;
};

export type MouseMoveEvent = ProcessedEventBase & {
  type: 'move';
  from: Position;
  to: Position;
};

export type MouseClickEvent = ProcessedEventBase & {
  type: 'click';
  position: Position;
};

export type MouseScrollEvent = ProcessedEventBase & {
  type: 'scroll';
  distance: {
    deltaX: number;
    deltaY: number;
  };
};

export type KeyboardEvent = ProcessedEventBase & {
  type: 'key';
  key: string;
};

export type ProcessedEvent = MouseMoveEvent | MouseClickEvent | MouseScrollEvent | KeyboardEvent;
