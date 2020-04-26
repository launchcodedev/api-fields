# API Fields
[![Licensed under MPL 2.0](https://img.shields.io/badge/license-MPL_2.0-green.svg)](https://www.mozilla.org/en-US/MPL/2.0/)
[![Build Status](https://github.com/servall/api-fields/workflows/CI/badge.svg)](https://github.com/servall/api-fields/actions)
[![npm](https://img.shields.io/npm/v/@lcdev/api-fields.svg)](https://www.npmjs.com/package/@lcdev/api-fields)
[![BundlePhobia](https://badgen.net/bundlephobia/minzip/@lcdev/api-fields)](https://bundlephobia.com/result?p=@lcdev/api-fields@latest)

A small utility package that enables an easy way to guarantee that your API doesn't return fields
that you didn't want it to.

```bash
yarn add @lcdev/api-fields@0.1
```

You might want to reduce the duplication when extracting return values. Most of the time,
you want to return the same fields for the same entities, records, etc.

API Fields is a decorator for classes that gives you the ability to tie in to [`@lcdev/mapper`](https://github.com/servall/mapper),
specifically its `extract` function.

```typescript
import { ApiField } from '@lcdev/api-fields';

class User extends BaseEntity {
  @ApiField()
  id: number;

  // we never want to give this back in API responses
  // maybe it's private, or maybe we don't want consumers to depend on it
  privateField: number;

  @ApiField()
  firstName: string;

  // here, we only want the API Fields of Permission in the nested field
  @ApiField(() => Permission)
  permission: Permission;

  ...
}
```

To reveal the 'Extraction' object that can be used by `@lcdev/mapper`:

```typescript
import { getApiFields } from '@lcdev/api-fields';
import { extract } from '@lcdev/mapper';

// getApiFields can be called anywhere to retrieve the `Extraction` object
const extraction = getApiFields(User);

// use the mapper package to take back only the fields you're interested in
const trimmedFields = extract(fullFields, extraction);
```

Decorator possibilities:
- `@ApiField() property` means take all of `property`
- `@ApiField(() => PropertyType) property` means take ApiFields of `property`
- `@ApiField(() => [PropertyType]) property[]` means take ApiFields of all `property`s
- `@ApiField({ ... }) property` means take `{ ... }` from `property`

You might want to create middleware in your router to do this type of extraction for you.
Internally at Launchcode we do just that, and would like to open-source that effort as well.

### Alternatives
- [class-transformer](https://github.com/typestack/class-transformer)
