'use client';

import cx from 'classnames';
import { useEffect, useRef, useState } from 'react';

interface Props {
  autoFocus?: boolean;
  className?: string;
  disabledInput?: boolean;
  formRef?: React.RefObject<HTMLFormElement>;
  history?: string[];
  initRows?: number;
  name?: string;
  onSubmitKeyDown?: (val?: string) => Promise<void>;
  onValueChange?: (val: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  textColor?: string;
  value?: string;
}

export function GrowableTextArea(props: Props) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempValue, setTempValue] = useState('');

  const { history } = props;

  useEffect(() => {
    if (props.autoFocus) textAreaRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnChange = (content: string) => {
    if ((history ?? [])[historyIndex] !== content) setHistoryIndex(-1);
    if (!textAreaRef.current) return;
    if (textAreaRef.current.value !== content) textAreaRef.current.value = content;
    textAreaRef.current.style.height = 'auto';
    if (content) textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    if (props.onValueChange) props.onValueChange(content);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isSubmissionKey = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
    if (props.disabledInput || !isSubmissionKey) return;
    event.preventDefault();

    if (props.formRef) props.formRef.current?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    if (props.onSubmitKeyDown) props.onSubmitKeyDown(textAreaRef.current?.value);
    handleOnChange('');
  };
  const handleKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const content = event.currentTarget.value;
    switch (event.key) {
      case 'ArrowUp': {
        if (event.currentTarget.selectionStart !== 0) return;
        if (!history || history.length < 1) return;
        const newIndex = historyIndex === -1 ? history.length - 1 : historyIndex - 1;
        const newInput = history[newIndex];
        if (!newInput) return;

        if (historyIndex === -1) setTempValue(content);
        handleOnChange(newInput);
        setHistoryIndex(newIndex);
        break;
      }
      case 'ArrowDown': {
        if (event.currentTarget.selectionStart !== content.length) return;
        if (!history || history.length < 1) return;
        if (historyIndex < 0 || historyIndex > history.length - 1) return;
        if (historyIndex === history.length - 1) {
          handleOnChange(tempValue);
          setHistoryIndex(-1);
          return;
        }

        const newIndex = historyIndex + 1;
        const newInput = history[newIndex];
        if (!newInput) return;

        handleOnChange(newInput);
        setHistoryIndex(newIndex);
        break;
      }
      default:
        break;
    }
  };

  return (
    <textarea
      ref={textAreaRef}
      className={cx(
        'resize-none overflow-y-auto overflow-x-hidden border-none bg-transparent p-0 text-sm outline-none ring-0 focus:ring-0',
        props.className,
        props.textColor ?? 'text-black',
        props.placeholderTextColor ?? 'placeholder:text-white/30',
      )}
      name={props.name}
      onChange={(e) => handleOnChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      placeholder={props.placeholder}
      rows={props.initRows ?? 1}
      value={props.value}
    />
  );
}
