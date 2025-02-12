import { createSwaggerSpec } from 'next-swagger-doc';
import { ExtensionApiSpec } from '~src/app/api/extension/ExtensionApiSpec';
import { ReactSwagger } from '~src/components/swagger/ReactSwagger';

export default function ExtensionApiDocPage() {
  return (
    <ReactSwagger
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spec={createSwaggerSpec(new ExtensionApiSpec().apiSpec as any)}
      redirectUrl={process.env.NEXT_PUBLIC_ORIGIN + '/swagger-ui/oauth2-redirect.html'}
    />
  );
}
