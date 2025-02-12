import cx from 'classnames';
import { upperCase } from 'lodash';
import { useContext, useEffect, useRef, useState } from 'react';
import { InteractionEventContext } from '~src/contexts/InteractionEventContext';

interface Props {
  teachModeOn: boolean;
}

export default function RemoteBrowserControlIndicator(props: Props) {
  const { events: interactionEvents } = useContext(InteractionEventContext);

  const [keyPressed, setKeyPressed] = useState<string | undefined>(undefined);
  const [mouseClicked, setMouseClicked] = useState<boolean>(false);
  const [mouseState, setMouseState] = useState<'move' | 'scroll' | undefined>(undefined);
  const timeoutIdRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const { teachModeOn } = props;

  useEffect(() => {
    const event = interactionEvents[interactionEvents.length - 1];
    if (!event) return;

    switch (event.type) {
      case 'mouse': {
        switch (event.data.position.event) {
          case 'mousedown':
            setMouseClicked(true);
            return;
          case 'mouseup':
            setMouseClicked(false);
            return;
          case 'mousemove':
            setMouseState('move');

            if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = setTimeout(() => setMouseState(undefined), 200);
            return;
          default:
            throw new Error('Unknown mouse event');
        }
      }
      case 'wheel': {
        setMouseState('scroll');
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = setTimeout(() => setMouseState(undefined), 200);
        return;
      }
      case 'keyboard': {
        setMouseState(undefined);

        const { key, event: keyEvent } = event.data;
        if (keyEvent === 'keydown') {
          setKeyPressed(key);
        } else if (keyEvent === 'keyup') {
          if (keyPressed === key) setKeyPressed(undefined);
        } else {
          throw new Error('Unknown key event ' + keyEvent);
        }
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionEvents]);

  if (!teachModeOn) return null;

  const renderContent = () => {
    const renderInputContainer = (text: string, isOn: boolean, isWide?: boolean) => (
      <div
        className={cx(
          'flex h-12 items-center justify-center rounded-lg border-2 border-white',
          isWide ? 'ml-4 w-32' : 'ml-1 w-20',
          isOn ? 'bg-blue-300' : 'bg-transparent',
        )}
      >
        {text}
      </div>
    );

    const keyPressText = upperCase((keyPressed === ' ' ? 'space' : keyPressed) ?? 'no key');
    return (
      <>
        {/* Show the Mouse-Move Component when showMouseMove is true */}
        {renderInputContainer(upperCase('scroll'), mouseState === 'scroll')}
        {renderInputContainer(upperCase('click'), mouseClicked)}
        {renderInputContainer(upperCase('move'), mouseState === 'move')}
        {renderInputContainer(upperCase(keyPressText), !!keyPressed, true)}
      </>
    );
  };

  return <div className="flex h-fit w-fit items-center justify-center bg-transparent">{renderContent()}</div>;
}
