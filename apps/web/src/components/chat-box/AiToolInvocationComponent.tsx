import { WrenchIcon } from '@heroicons/react/24/solid';
import { Tooltip } from '@mui/material';
import { ToolInvocation } from 'ai';
import { camelCase, upperFirst } from 'lodash';

interface Props {
  toolInvocation: ToolInvocation;
}

export function AiToolInvocationComponent({ toolInvocation }: Props) {
  const { toolName, args, state } = toolInvocation;
  const displayText = upperFirst(camelCase(toolName));
  const toolTipTexts = [{ tag: 'INPUT', content: typeof args === 'string' ? args : JSON.stringify(args) }];
  if (state === 'result') toolTipTexts.push({ tag: 'OUTPUT', content: toolInvocation.result || 'undefined' });

  const toolTipComponent = toolTipTexts.map((text, i) => (
    <div key={i} className="flex w-full flex-row pb-1 pt-1">
      <p className="mr-1 h-fit rounded bg-blue-600 p-0.5 text-white">{text.tag}</p>
      <p className="max-h-12 overflow-scroll">{text.content}</p>
    </div>
  ));

  return (
    <Tooltip key={toolInvocation.toolCallId} placement="top" arrow title={toolTipComponent} enterDelay={300}>
      <div className="m-1 flex w-fit cursor-default flex-row items-center rounded-md bg-blue-400/75 px-2 py-1">
        <div className="flex h-3 w-3 items-center justify-center rounded-full bg-white p-0.5">
          <WrenchIcon className="h-full w-full rounded-full text-blue-400" />
        </div>
        <p className="ml-2 text-xs text-white">{displayText}</p>
      </div>
    </Tooltip>
  );
}
