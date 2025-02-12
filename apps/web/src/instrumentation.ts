import { registerOTel } from '@vercel/otel';
import { AISDKExporter } from 'langsmith/vercel';

export function register() {
  registerOTel({
    serviceName: 'aident-ai-langsmith-service',
    traceExporter: new AISDKExporter(),
  });
}
