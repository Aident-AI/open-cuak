'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import '~src/components/swagger/styles.css';

interface Props {
  spec: object;
  redirectUrl: string;
}

export const ReactSwagger = ({ spec, redirectUrl }: Props) => {
  return <SwaggerUI spec={spec} oauth2RedirectUrl={redirectUrl} />;
};
