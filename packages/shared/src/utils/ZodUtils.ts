import { ZodNull, ZodObject, ZodRawShape, ZodSchema } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

export type ZodSchemaObject = ZodObject<ZodRawShape>;
export type NullableZodSchemaObject = ZodSchemaObject | ZodNull;

export class ZodUtils {
  public static isUndefined(schema: ZodSchema): boolean {
    return schema.isOptional() && !schema.isNullable();
  }

  public static parseToJsonSchema(schema: ZodSchema): Record<string, unknown> {
    const jsonSchema = zodToJsonSchema(schema);

    const removeSchemaField = (obj: object) => {
      if (Array.isArray(obj)) {
        obj.forEach(removeSchemaField);
      } else if (typeof obj === 'object' && obj !== null) {
        if ('$schema' in obj) delete obj.$schema;
        Object.values(obj).forEach(removeSchemaField);
      }
    };
    removeSchemaField(jsonSchema);

    return jsonSchema;
  }
}
