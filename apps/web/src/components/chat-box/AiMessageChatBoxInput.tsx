import { PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/solid';
import { CreateMessage, Message } from 'ai';
import cx from 'classnames';
import { FormEvent } from 'react';
import { GrowableTextArea } from '~src/components/GrowableTextArea';

interface Props {
  formRef: React.RefObject<HTMLFormElement>;
  loading: boolean;
  messages: Message[];
  stop: () => void;
  append: (message: Message | CreateMessage) => Promise<string | null | undefined>;
}

export function AiMessageChatBoxInput({ formRef, loading, messages, append }: Props) {
  const inputHistory = messages.filter((m) => m.role === 'user').map((m) => m.content);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) {
      stop();
      return;
    }

    const formData = new FormData(e.currentTarget);
    const input = (formData.get('message') as string).trim();
    if (!input || input.length < 1) return;

    formRef.current?.reset();
    await append({ role: 'user', content: input });
  };

  return (
    <div
      className={cx(
        'fixed left-0 -mt-2 h-fit w-full bg-transparent p-3 transition-all duration-300',
        messages.length > 0 ? 'bottom-0' : 'bottom-24',
      )}
    >
      <form
        ref={formRef}
        className="flex h-fit w-full flex-row items-center justify-center rounded-md bg-sky-600/95 p-1.5 shadow-centered shadow-fuchsia-600/50 backdrop-blur-sm"
        onSubmit={onSubmit}
        name="send-message-form"
      >
        <GrowableTextArea
          autoFocus
          className="ml-0.5 flex h-5 max-h-20 flex-1 bg-transparent text-sm"
          disabledInput={loading}
          formRef={formRef}
          history={inputHistory}
          name="message"
          placeholder="Help me with..."
          placeholderTextColor="placeholder:text-white/30"
          textColor="text-white"
        />
        <button type="submit" className="ml-1.5 rounded-full bg-blue-600 p-[0.3rem]">
          {loading ? <StopIcon className="h-3 w-3 text-white" /> : <PaperAirplaneIcon className="h-3 w-3 text-white" />}
        </button>
      </form>
    </div>
  );
}
