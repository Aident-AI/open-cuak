'use client';

import _ from 'lodash';
import { OperationObject, PathItemObject, RequestBodyObject } from 'openapi3-ts/oas31';
import { useEffect, useState } from 'react';
import { getHost } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import ButtonListPage from '~src/app/extension/debug/home/ButtonListPage';
import PopupDialog, { parseRequestBody } from '~src/app/extension/debug/interactions/Dialogue';

type ApiTool = OperationObject & { url: string };

interface Props {
  onClose?: () => void;
  remoteBrowserSessionId?: string;
}

export default function DebugInteractionsPage(props: Props) {
  const [tools, setTools] = useState<ApiTool[]>([]);
  const [pickedTool, setPickedTool] = useState<ApiTool | undefined>(undefined);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const exec = async () => {
      const response = await fetch(getHost() + '/api-schema/extension');
      if (!response.ok) {
        ALogger.error({
          context: 'Failed to fetch interactions',
          response: { status: response.status, statusText: response.statusText },
        });
        return;
      }

      const schema = await response.json();
      const tools = Object.entries(schema.paths)
        .map(([url, path]) => ({ url, ...(path as PathItemObject).post }) as ApiTool)
        .filter((i) => !!i);
      _.sortBy(tools, (tool) => tool.operationId);
      setTools(tools);
    };
    exec();
  }, []);

  // buttons
  const getToolName = (tool?: ApiTool) => tool?.operationId?.replaceAll('_', ':') || 'Unknown';
  const buttons = tools.map((tool: ApiTool) => ({
    text: getToolName(tool),
    onClick: () => setPickedTool(tool),
  }));

  // dialog
  const handleClose = () => {
    setPickedTool(undefined);
    setShowRaw(false);
  };
  const schema = pickedTool ? parseRequestBody(pickedTool.requestBody as RequestBodyObject) : undefined;
  const json = pickedTool ? { url: pickedTool.url, ...pickedTool.requestBody } : undefined;

  return (
    <div className="relative h-full w-full">
      <ButtonListPage
        buttons={buttons}
        buttonMargin="small"
        snackbar={{ message: toastMessage, onClose: () => setToastMessage(undefined) }}
        onClose={props.onClose}
      />
      <PopupDialog
        handleClose={handleClose}
        handleResponse={(response) => setToastMessage(JSON.stringify(response))}
        open={!!pickedTool}
        title={getToolName(pickedTool)}
        api={pickedTool?.url}
        execSessionId={props.remoteBrowserSessionId}
        schema={schema}
        summary={pickedTool?.summary}
      >
        <p className="my-1 cursor-pointer text-xs text-blue-500" onClick={() => setShowRaw((raw) => !raw)}>
          Show JSON
        </p>
        <pre className="text-xs">{showRaw && JSON.stringify(json, null, 2)}</pre>
      </PopupDialog>
    </div>
  );
}
