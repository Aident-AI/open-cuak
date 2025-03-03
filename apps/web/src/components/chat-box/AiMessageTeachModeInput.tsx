import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { Message } from 'ai';
import cx from 'classnames';
import { FormEvent, useEffect, useState } from 'react';
import { v4 as UUID } from 'uuid';
import { GrowableTextArea } from '~src/components/GrowableTextArea';

interface Props {
  formRef: React.RefObject<HTMLFormElement>;
  messages: Message[];
  append: (message: Message) => void | Promise<void>;
}

type Role = 'user' | 'assistant' | 'system';

export function AiMessageTeachModeInput({ formRef, messages, append }: Props) {
  const [role, setRole] = useState<Role>('user');

  useEffect(() => {
    if (messages.length < 1) setRole('user');
    else setRole('assistant');
  }, [messages]);

  const inputHistory = messages.map((m) => m.content);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const input = (formData.get('message') as string).trim();
    if (!input || input.length < 1) return;
    await append({ role, content: input, id: UUID() });

    formRef.current?.reset();
  };

  const renderUserInstruction = () => {
    return (
      <>
        <text className="flex w-full items-center justify-center text-white/70 underline">Instruction</text>
        <div className="flex w-full flex-col items-start px-4 py-2 text-sm text-white/70">
          <ol className="list-decimal pl-4">
            <li>Describe the workflow or task on a high level</li>
            <li>Click the record button to start to teach Aiden</li>
            <li>Do the workflow in the browser</li>
            <li>During the workflow, add comments that you think are helpful for Aiden to understand</li>
          </ol>
        </div>
      </>
    );
  };
  const renderRolePicker = () => {
    if (messages.length < 1) return null;

    const renderPicker = (r: Role, i: number) => (
      <button
        key={'role-picker-' + i}
        className={cx(
          'font-sm ml-1 rounded-xl border-2 border-white px-2 py-0.5 first:ml-0',
          role === r ? 'bg-white text-black' : 'bg-transparent text-white',
        )}
        onClick={() => setRole(r)}
      >
        {r}
      </button>
    );

    return <div className="mb-2">{(['user', 'assistant', 'system'] as Role[]).map(renderPicker)}</div>;
  };

  return (
    <div
      className={cx(
        'fixed left-0 -mt-2 h-fit w-full bg-transparent p-3 transition-all duration-300',
        messages.length > 0 ? 'bottom-0' : 'bottom-24',
      )}
    >
      {renderUserInstruction()}
      {renderRolePicker()}
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
          placeholder="Define your task goal..."
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
