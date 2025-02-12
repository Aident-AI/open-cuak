import * as yaml from 'js-yaml';
import { createSwaggerSpec } from 'next-swagger-doc';
import { NextResponse } from 'next/server';
import { withRequestLogging } from '~src/_logging/withRequestLogging';

const EmptyObjectPropertyPrompt = `properties:
                any:
                  type: string
                  description: anything`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BaseApiSchemaRoute = (spec: any) =>
  withRequestLogging(async (request: Request) => {
    const requestUrl = new URL(request.url);
    const format = requestUrl.searchParams.get('format');
    const yamlFormat = format === 'yaml';

    const swagger = createSwaggerSpec(spec);
    if (!yamlFormat) return NextResponse.json(swagger);

    const yamlString = yaml
      .dump(swagger)
      .replaceAll('const', 'enum')
      .replaceAll('properties: {}', EmptyObjectPropertyPrompt);
    const response = new NextResponse(yamlString);
    response.headers.set('content-type', 'text/yaml');
    return response;
  });
