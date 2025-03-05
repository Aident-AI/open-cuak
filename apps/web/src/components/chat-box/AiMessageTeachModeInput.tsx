import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { Message } from 'ai';
import cx from 'classnames';
import { FormEvent, useEffect, useState } from 'react';
import { v4 as UUID } from 'uuid';
import { AidenState } from '~src/app/portal/TeachAidenWindow';
import { GrowableTextArea } from '~src/components/GrowableTextArea';

interface Props {
  formRef: React.RefObject<HTMLFormElement>;
  messages: Message[];
  append: (message: Message) => void | Promise<void>;
  aidenState: AidenState;
}

export function AiMessageTeachModeInput({ formRef, messages, append, aidenState }: Props) {
  const [placeholderText, setPlaceholderText] = useState('Describe the workflow on a high level.');

  useEffect(() => {
    if (aidenState === AidenState.IDLE)
      if (messages.length > 0) return setPlaceholderText('Click the record button to start to teach Aiden');
    if (aidenState === AidenState.SHADOWING)
      return setPlaceholderText('Add comments that you think are helpful for Aiden to understand');
  }, [aidenState, messages]);

  const inputHistory = messages.map((m) => m.content);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const input = (formData.get('message') as string).trim();
    if (!input || input.length < 1) return;
    await append({ role: 'user', content: input, id: UUID() });

    formRef.current?.reset();
  };

  const renderUserInstruction = () => {
    if (messages.length > 0) return null;
    return (
      <>
        <span className="flex w-full items-center justify-center text-white/70 underline">Instruction</span>
        <div className="flex w-full flex-col items-start px-4 py-2 text-sm text-white/70">
          <ol className="list-decimal pl-4">
            <li>Describe the workflow on a high level</li>
            <li>Click the record button to start to teach Aiden</li>
            <li>Do the workflow in the browser</li>
            <li>During the workflow, add comments that you think are helpful for Aiden to understand</li>
          </ol>
        </div>
      </>
    );
  };

  return (
    <div
      className={cx(
        'fixed left-0 -mt-2 h-fit w-full bg-transparent p-3 transition-all duration-300',
        messages.length > 0 ? 'bottom-0' : 'bottom-24',
      )}
    >
      {renderUserInstruction()}
      <form
        ref={formRef}
        className="flex h-fit w-full flex-row items-center justify-center rounded-md bg-sky-600/95 p-1.5 shadow-centered shadow-fuchsia-600/50 backdrop-blur-sm"
        onSubmit={onSubmit}
        name="send-message-form"
      >
        <GrowableTextArea
          autoFocus
          className="ml-0.5 flex h-5 max-h-20 flex-1 bg-transparent text-sm"
          formRef={formRef}
          history={inputHistory}
          name="message"
          placeholder={placeholderText}
          placeholderTextColor="placeholder:text-white/30"
          textColor="text-white"
        />
        <button type="submit" className="ml-1.5 rounded-full bg-blue-600 p-[0.3rem]">
          <PaperAirplaneIcon className="h-3 w-3 text-white" />
        </button>
      </form>
    </div>
  );
}
