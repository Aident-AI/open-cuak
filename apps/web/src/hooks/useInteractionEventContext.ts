import { useContext } from 'react';
import { InteractionEventContext, InteractionEventContextProps } from '~src/contexts/InteractionEventContext';

export const useInteractionEventContext = (): InteractionEventContextProps => {
  const context = useContext(InteractionEventContext);
  if (!context) {
    throw new Error('useInteractionEventContext must be used within an InteractionEventProvider');
  }
  return context;
};
