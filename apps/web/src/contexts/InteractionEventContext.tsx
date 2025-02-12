import { ReactNode, createContext, useState } from 'react';
import { RemoteBrowserInteractionEvent } from '~shared/remote-browser/RemoteBrowserInteractionEvent';

export interface InteractionEventContextProps {
  events: RemoteBrowserInteractionEvent[];
  addEvent: (event: RemoteBrowserInteractionEvent) => void;
  clearEvents: () => void;
}

export const InteractionEventContext = createContext<InteractionEventContextProps>({
  events: [],
  addEvent: () => {},
  clearEvents: () => {},
});

export const InteractionEventProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<RemoteBrowserInteractionEvent[]>([]);

  const addEvent = (event: RemoteBrowserInteractionEvent) => setEvents((prevEvents) => [...prevEvents, event]);
  const clearEvents = () => setEvents([]);

  return (
    <InteractionEventContext.Provider value={{ events, addEvent, clearEvents }}>
      {children}
    </InteractionEventContext.Provider>
  );
};
