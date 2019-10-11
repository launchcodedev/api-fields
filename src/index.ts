/* eslint-disable no-underscore-dangle */
import { merge } from 'lodash';
import { Extraction } from '@lcdev/mapper';
import 'reflect-metadata';

type PrivateApiFields = {
  [key: string]: Extraction | (() => Function) | { lazy: () => Extraction };
};

const inject = (target: any, base = Object.getPrototypeOf(target)) => {
  Object.defineProperty(target, '__apiFields', {
    writable: true,
    value: {
      ...(base.__apiFields || {}),
      ...(target.__apiFields || {}),
    },
  });

  return target;
};

export const ApiField = (
  fieldType?: Extraction | (() => Function | [Function]) | { lazy: () => Extraction },
) =>
  function ApiFieldDecorator(klass: any, name: string) {
    const target = inject(klass.constructor);
    const __meta = Reflect.getMetadata('design:type', klass, name);

    target.__apiFields[name] = fieldType === undefined ? true : fieldType;

    target.__apiFields.__meta = target.__apiFields.__meta || {};
    target.__apiFields.__meta[name] = __meta;

    Object.defineProperty(target, 'getApiFields', {
      writable: true,
      value(seen = []) {
        const extract: any = {};

        Object.defineProperty(extract, '__meta', {
          writable: true,
          value: target.__apiFields.__meta,
        });
        Object.defineProperty(extract, '__metaExtra', {
          writable: true,
          value: target.__apiFields.__metaExtra,
        });

        Object.entries(target.__apiFields as PrivateApiFields).forEach(([name, val]) => {
          if (val === true) {
            extract[name] = true;
          } else {
            // @ApiField({ foo: true })
            if (typeof val !== 'function') {
              // @ApiField({ lazy: () => getApiFields(OtherClass) })
              if (typeof val === 'object' && 'lazy' in val && typeof val.lazy === 'function') {
                extract[name] = val.lazy();
                return;
              }

              extract[name] = val;
              return;
            }

            const nested = val();

            if (Array.isArray(nested) && nested.length === 1) {
              // @ApiField(() => [Type]) for array mapping is special
              const apiFields = getApiFields(nested[0], undefined, seen);
              extract[name] = [apiFields];

              Object.defineProperty(extract, '__meta', {
                writable: true,
                value: {
                  ...extract.__meta,
                  [name]: {
                    __meta: apiFields.__meta,
                    __metaExtra: apiFields.__metaExtra,
                    nested: true,
                    array: true,
                  },
                },
              });
            } else {
              // @ApiField(() => Type)
              extract[name] = getApiFields(nested, undefined, seen);

              Object.defineProperty(extract, '__meta', {
                writable: true,
                value: {
                  ...extract.__meta,
                  [name]: {
                    __meta: extract[name].__meta,
                    __metaExtra: extract[name].__metaExtra,
                    nested: true,
                  },
                },
              });
            }
          }
        });

        return extract;
      },
    });
  };

export const JsonSchemaData = (props: object) =>
  function JsonSchemaDataDecorator(klass: any, name: string) {
    const target = inject(klass.constructor);

    target.__apiFields.__metaExtra = target.__apiFields.__metaExtra || {};
    target.__apiFields.__metaExtra[name] = props;
  };

export const getApiFields = (
  klass: any,
  and?: object,
  seen: any[] = [],
): { [key: string]: Extraction } => {
  let fields = {};

  if (klass) {
    // short circuit if we've seen this class / entity before while recursing
    if (seen.includes(klass) || seen.includes(klass.constructor)) {
      // seen isn't part of the public api, it's only used in recursion
      return false as any;
    }

    if (klass.getApiFields) {
      fields = klass.getApiFields(seen.concat(klass));
    }

    if (klass.constructor.getApiFields) {
      fields = klass.constructor.getApiFields(seen.concat(klass.constructor));
    }
  }

  return merge(fields, and ?? {});
};

export const extractJsonSchema = (klass: any, doExtractMeta: boolean = true): any => {
  if (Array.isArray(klass)) {
    return {
      type: 'array',
      items: extractJsonSchema(klass[0], doExtractMeta),
    };
  }

  const meta: any = doExtractMeta ? getApiFields(klass).__meta : klass.__meta;
  const metaExtra: any = doExtractMeta ? klass.__apiFields?.__metaExtra : klass.__metaExtra;
  const properties: any = {};

  for (const [k, v] of Object.entries(meta || klass) as any) {
    if (v.array) {
      if (!v.__meta) continue;

      properties[k] = {
        type: 'array',
        items: extractJsonSchema(v, false),
      };
    } else if (v.nested) {
      if (!v.__meta) continue;

      properties[k] = extractJsonSchema(v, false);
    } else if (v === Number) {
      properties[k] = { type: 'number' };
    } else if (v === Boolean) {
      properties[k] = { type: 'boolean' };
    } else if (v === String) {
      properties[k] = { type: 'string' };
    } else if (v === Date) {
      properties[k] = { type: 'string' };
    }

    if (metaExtra?.[k]) {
      properties[k] = merge(properties[k], metaExtra[k]);
    }
  }

  return {
    type: 'object',
    properties,
    additionalProperties: false,
  };
};
