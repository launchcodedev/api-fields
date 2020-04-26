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
  firstName: string;
  lastName: string;

  @ApiField() // works just fine on getters
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  // here, we only want the API Fields of Permission in the nested field
  @ApiField(() => Permission)
  permission: Permission;

  ...
}
```

Under the hood, this creates a listing of the fields you want to expose. We
call them "API Fields" because this is usually the way you expose fields in
JSON API responses.

We can get that metadata about any given class with the `getAPIFields` function.
The object returned can actually be used directly in `@lcdev/mapper`.

```typescript
import { getApiFields } from '@lcdev/api-fields';
import { extract } from '@lcdev/mapper';

// getApiFields can be called anywhere to retrieve the `Extraction` object
const extraction = getApiFields(User);

// use the mapper package to take back only the fields you're interested in
const trimmedFields = extract(fullFields, extraction);
```

### Formats
- `@ApiField() propName`: extract `propName` as-is
- `@ApiField(() => PropertyType) propName`: extract the ApiFields of `PropertyType` as `propName`
- `@ApiField(() => [PropertyType]) propName[]`: map as array, extracting ApiFields of each element
- `@ApiField({ ... }) propName`: extract fields from `propName` (same as `@lcdev/mapper`)
- `@ApiField(false) propName`: don't include this field

### Renames
Renaming a field is supported, in the same way it is in `@lcdev/mapper`.

```typescript
import { ApiField } from '@lcdev/api-fields';
import { rename } from '@lcdev/mapper';

class ImageUpload {
  @ApiField(rename('url'))
  awsURL: string;
}
```

When being extracted, the field will be renamed.

### Transforms
Transforming a field is supported, in the same way it is in `@lcdev/mapper`.

```typescript
import { ApiField } from '@lcdev/api-fields';
import { transform } from '@lcdev/mapper';

class ImageUpload {
  @ApiField(transform(v => v.replace('https:', '')))
  awsURL: string;
}
```

### Alternatives
- [class-transformer](https://github.com/typestack/class-transformer)
