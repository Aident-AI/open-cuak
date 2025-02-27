import { XMarkIcon } from '@heroicons/react/24/solid';
import { Tooltip } from '@mui/material';
import { CreateMessage, Message } from 'ai';
import cx from 'classnames';
import Image from 'next/image';
import { isRenderTextTool, isThinkAndPlanTool } from '~shared/agent/AiAgentNode';
import { AiAidenApiMessageAnnotation } from '~src/app/api/ai/aiden/AiAidenApi';
import { LoadingDots } from '~src/components/LoadingDots';
import { AiToolInvocationComponent } from '~src/components/chat-box/AiToolInvocationComponent';
import { LogoInChatBox } from '~src/components/chat-box/LogoInChatBox';
import { CustomMarkdownRenderer } from '~src/components/markdown-render/CustomMarkdownRenderer';

interface Props {
  messages: Message[];
  onScroll: () => void;
  scrollableRef: React.RefObject<HTMLDivElement>;

  annotationMap?: Record<string, AiAidenApiMessageAnnotation>;
  className?: string;
  deleteMessage?: (id: string) => void;
  error?: Error;
  handleButtonPress?: () => void;
  handleButtonRelease?: () => void;
  intros?: string[];
  logoSubtitle?: string;
  teachMode?: boolean;
}

export default function AiMessagesForChatBox(props: Props) {
  const { handleButtonPress, handleButtonRelease, intros, messages, onScroll, scrollableRef } = props;

  const renderIntros = () => {
    if (!intros || intros.length < 1) return null;

    return (
      <>
        {intros.map((text, i) => (
          <div key={`intro-${i}`} id={`intro-${i}`} className="h-fit w-full text-center text-sm text-gray-100">
            {text}
          </div>
        ))}
      </>
    );
  };

  const tooltipSource = new Map();

  const renderMessages = () => {
    if (messages.length < 1)
      return (
        <LogoInChatBox
          subtitle={props.logoSubtitle ?? 'Aiden Engram'}
          handleButtonPress={handleButtonPress}
          handleButtonRelease={handleButtonRelease}
        />
      );

    const renderMessage = (msg: CreateMessage) => {
      const { id, role, content } = msg;
      if (!id) throw new Error('Message ID is required.');

      const renderMainContent = () => {
        let messageText = content;
        const renderTextToolInvocation = msg.toolInvocations?.find((ti) => isRenderTextTool(ti.toolName));
        const renderToolIconToolInvocations = msg.toolInvocations?.filter((ti) => !isRenderTextTool(ti.toolName));
        if (renderTextToolInvocation) {
          const finalText = renderTextToolInvocation.args?.message;
          if (finalText) {
            if (messageText.length > 0) messageText += '\n\n';
            if (isThinkAndPlanTool(renderTextToolInvocation.toolName)) {
              messageText += '> ' + finalText.replaceAll('\n', '\n> ');
            } else {
              messageText += finalText;
            }
          }
        }
        const hasToolInvocations = renderToolIconToolInvocations && renderToolIconToolInvocations.length > 0;
        const isLoading = (messageText ?? '').length < 1 && !hasToolInvocations;
        if (isLoading) return <LoadingDots key={id} />;

        const renderTextContent = () => {
          if (!messageText || messageText.length < 1) return null;
          return (
            <div
              key={`message-${id}`}
              className={cx('messageChildren text-sm first:mt-0', {
                'animate-fade': role === 'user' || role === 'assistant',
                'prose prose-sm prose-blue prose-h1:my-3 prose-h2:my-2 prose-pre:bg-transparent prose-li:marker:text-blue-600':
                  role === 'assistant',
              })}
            >
              <CustomMarkdownRenderer content={messageText} tooltipSource={tooltipSource} />
            </div>
          );
        };
        const renderToolInvocations = () => {
          if (!hasToolInvocations) return null;
          return renderToolIconToolInvocations!.map((toolInvocation) => (
            <AiToolInvocationComponent key={toolInvocation.toolCallId} toolInvocation={toolInvocation} />
          ));
        };

        return (
          <>
            {renderTextContent()}
            {renderToolInvocations()}
          </>
        );
      };
      const renderMessageStateInfo = () => {
        const anno = props.annotationMap?.[msg.id ?? ''];
        if (!anno) return null;
        const { beforeStateBase64, cursorType, cursorPosition } = anno;
        if (!beforeStateBase64) return null;

        const onClick = () => window.open(beforeStateBase64);
        const screenshot = (
          <div>
            <Image
              className="h-auto w-full cursor-pointer"
              height={(720 / 1280) * 300}
              width={300}
              src={beforeStateBase64}
              alt="Tooltip Image"
              onClick={onClick}
            />
            <p className="mt-1 text-sm text-white">{`Cursor Type: ${cursorType}`}</p>
            <p className="mt-1 text-sm text-white">{`Cursor Position: ${JSON.stringify(cursorPosition)}`}</p>
          </div>
        );
        return (
          <Tooltip title={screenshot} placement="top-end" arrow>
            <div
              className="absolute bottom-1 right-1 h-2 w-2 cursor-pointer rounded-full bg-blue-400"
              onClick={onClick}
            />
          </Tooltip>
        );
      };
      const renderMessageDeleteButton = () => {
        if (!props.teachMode || role === 'user') return null;
        const deleteMessage = () => props.deleteMessage?.(id);

        return (
          <div className="absolute right-[-8px] top-[-12px] h-fit w-fit cursor-pointer rounded-full">
            <button className="h-fit w-fit rounded-full bg-blue-600/50 p-[2px]" onClick={deleteMessage}>
              <XMarkIcon className="h-3 w-3 bg-transparent text-white" />
            </button>
          </div>
        );
      };

      const isUser = role === 'user';
      return (
        <div
          key={id}
          id={id}
          className={cx('relative mt-2 h-fit w-fit max-w-full break-words rounded p-2', {
            'ml-auto bg-blue-600 text-white': isUser,
            'mr-auto bg-white/50 text-left text-black/70 shadow-centered-light shadow-blue-600/20 ring-gray-100 backdrop-blur-3xl':
              !isUser,
          })}
        >
          {renderMainContent()}
          {renderMessageStateInfo()}
          {props.teachMode && renderMessageDeleteButton()}
        </div>
      );
    };

    const messageSteps = [] as CreateMessage[][];
    let currMessageStep = [] as CreateMessage[];
    messages.forEach((m) => {
      if (currMessageStep.length < 1 || m.role === currMessageStep[0].role) {
        currMessageStep.push(m);
        return;
      }
      messageSteps.push(currMessageStep);
      currMessageStep = [];
      currMessageStep.push(m);
    });
    if (currMessageStep.length > 0) messageSteps.push(currMessageStep);

    const ms = messageSteps.map((step) => step.map((m) => renderMessage(m))).flat();
    return ms;
  };

  const renderError = () => {
    if (!props.error) return null;

    return (
      <div
        className={cx(
          'relative mr-auto mt-2 h-fit w-fit max-w-full break-words rounded bg-red-500/50 p-2 text-left text-sm text-red-800 shadow-centered-light shadow-red-600/20 ring-gray-100 backdrop-blur-3xl',
        )}
      >
        {props.error.message}
      </div>
    );
  };

  return (
    <div
      ref={scrollableRef}
      onScroll={onScroll}
      className={cx('h-full w-full overflow-y-scroll px-3 pb-16 pt-14', props.className)}
    >
      {renderIntros()}
      {renderMessages()}
      {renderError()}
    </div>
  );
}
