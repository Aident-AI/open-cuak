import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseEndpointApi } from '~src/app/api/BaseEndpointApi';
import { SimpleRequestWrapperConfig, simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';

export const handleBaseEndpointRequest = (api: BaseEndpointApi, config: SimpleRequestWrapperConfig) =>
  simpleRequestWrapper<z.infer<typeof api.RequestSchema.schema>>(api.RequestSchema.schema, config, async (request) =>
    NextResponse.json(await api.exec(request)),
  );
