import { ElementHandle } from 'puppeteer-core';
import { ZodSchema, ZodUndefined, z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { IInteractable } from '~shared/interactable/IInteractable';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { NullableZodSchemaObject } from '~shared/utils/ZodUtils';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export interface IBaseInteractionStatic {
  type: InteractableInteraction;
  description: string | undefined;
  configSchema: NullableZodSchemaObject;
  getConfigJsonSchema(): Record<string, unknown>;
}

interface IBaseInteractionInstance {
  exec(
    config: z.infer<ZodSchema<Record<string, unknown>> | ZodUndefined> | undefined,
    context: IActionConfigExecContext,
  ): void | Promise<void>;
}

// Type check function for static side enforcement
export function enforceIBaseInteractionStatic<T extends IBaseInteractionStatic>(constructor: T) {
  // Implementation is not required, as this serves as a compile-time check
}

export abstract class Base_Interaction implements IBaseInteractionInstance {
  static type: InteractableInteraction;
  static description: string | undefined;
  static configSchema: NullableZodSchemaObject;

  public static getConfigJsonSchema(): Record<string, unknown> {
    const jsonSchema = zodToJsonSchema(this.configSchema);
    delete jsonSchema.$schema;
    return jsonSchema;
  }

  constructor(
    public readonly node: IInteractable.Node,
    public readonly handle: ElementHandle,
  ) {
    if (!handle) throw new Error('handle is required');
  }

  abstract exec(
    config: z.infer<typeof Base_Interaction.configSchema> | undefined,
    context: IActionConfigExecContext,
  ): void | Promise<void>;
}

enforceIBaseInteractionStatic(Base_Interaction);
