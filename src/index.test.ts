import { extract } from '@lcdev/mapper';
import { ApiField, JsonSchemaData, getApiFields, extractJsonSchema } from './index';

test('api field', () => {
  class MyEntity {
    propertyA: boolean = true;

    propertyB: string = 'default';

    @ApiField()
    propertyC: number = 12;
  }

  expect(getApiFields(MyEntity)).toEqual({ propertyC: true });
  expect(extract(new MyEntity(), getApiFields(MyEntity))).toEqual({ propertyC: 12 });
});

test('api field nested', () => {
  class MyOtherEntity {
    @ApiField()
    propertyA: boolean = true;

    propertyB: string = 'default';
  }

  class MyEntity {
    propertyA: boolean = true;

    propertyB: string = 'default';

    @ApiField()
    propertyC: number = 12;

    @ApiField(() => MyOtherEntity)
    other?: MyOtherEntity = new MyOtherEntity();
  }

  expect(getApiFields(MyEntity)).toEqual({ propertyC: true, other: { propertyA: true } });
  expect(extract(new MyEntity(), getApiFields(MyEntity))).toEqual({
    propertyC: 12,
    other: {
      propertyA: true,
    },
  });
});

test('api field recursion 1', () => {
  class EntityA {
    @ApiField(() => EntityB) entityB!: unknown;
  }
  class EntityB {
    @ApiField(() => EntityA) entityA!: unknown;
  }

  expect(getApiFields(EntityA)).toEqual({
    entityB: {
      entityA: false,
    },
  });
});

test('api field recursion 2', () => {
  class EntityA {
    @ApiField(() => EntityC) entityC!: unknown;
  }
  class EntityB {
    @ApiField(() => EntityA) entityA!: unknown;
    @ApiField(() => EntityC) entityC!: unknown;
  }
  class EntityC {
    @ApiField(() => EntityB) entityB!: unknown;
  }

  expect(getApiFields(EntityA)).toEqual({
    entityC: {
      entityB: {
        entityA: false,
        entityC: false,
      },
    },
  });
});

test('api field recursion 3', () => {
  class Parent {
    @ApiField(() => [Child])
    children?: Child[];
  }
  class Child {
    @ApiField(() => Parent)
    parent!: Parent;
  }

  expect(getApiFields(Parent)).toEqual({
    children: [{ parent: false }],
  });

  expect(getApiFields(Child)).toEqual({
    parent: {
      children: [false],
    },
  });
});

test('api field arr', () => {
  class MyOtherEntity {
    @ApiField()
    propertyA: boolean = true;

    propertyB: string = 'default';
  }

  class MyEntity {
    propertyA: boolean = true;

    propertyB: string = 'default';

    @ApiField()
    propertyC: number = 12;

    @ApiField(() => [MyOtherEntity])
    other?: MyOtherEntity[] = [new MyOtherEntity(), new MyOtherEntity()];
  }

  expect(getApiFields(MyEntity)).toEqual({ propertyC: true, other: [{ propertyA: true }] });
  expect(extract(new MyEntity(), getApiFields(MyEntity))).toEqual({
    propertyC: 12,
    other: [{ propertyA: true }, { propertyA: true }],
  });
});

test('api field subclassing', () => {
  class MyOtherEntity {
    @ApiField()
    propertyA: boolean = true;

    propertyB: string = 'default';
  }

  class MyEntity extends MyOtherEntity {
    @ApiField()
    propertyC: number = 12;
  }

  expect(getApiFields(MyEntity)).toEqual({ propertyC: true, propertyA: true });
  expect(extract(new MyEntity(), getApiFields(MyEntity))).toEqual({
    propertyC: 12,
    propertyA: true,
  });
});

test('api field subclassing and disabling', () => {
  class MyOtherEntity {
    @ApiField()
    propertyA: boolean = true;
  }

  class MyEntity extends MyOtherEntity {
    @ApiField(false)
    propertyA!: boolean;
  }

  expect(getApiFields(MyEntity)).toEqual({ propertyA: false });
});

test('api field with custom type', () => {
  class MyEntity {
    @ApiField({ baz: true })
    propertyC: object = { foo: 'bar', baz: 'bat' };
  }

  expect(getApiFields(MyEntity)).toEqual({ propertyC: { baz: true } });
  expect(extract(new MyEntity(), getApiFields(MyEntity))).toEqual({
    propertyC: {
      baz: 'bat',
    },
  });
});

test('api field merging', () => {
  class MyEntity {
    @ApiField()
    propertyA: boolean = true;

    propertyB: string = 'default';

    @ApiField()
    propertyC: number = 12;
  }

  expect(getApiFields(MyEntity, { propertyA: false })).toEqual({
    propertyA: false,
    propertyC: true,
  });
});

test('lazy literal', () => {
  class MyEntity {
    @ApiField({ lazy: () => ({ bar: true }) })
    propertyA = { foo: 1, bar: 2 };
  }

  expect(getApiFields(MyEntity)).toEqual({
    propertyA: { bar: true },
  });
});

test('simple json schema', () => {
  class MyEntity {
    propertyA!: boolean;

    @ApiField()
    propertyB!: string;

    @ApiField()
    propertyC!: number;
  }

  expect(extractJsonSchema(MyEntity)).toEqual({
    type: 'object',
    additionalProperties: false,
    properties: {
      propertyB: {
        type: 'string',
      },
      propertyC: {
        type: 'number',
      },
    },
  });
});

test('nested json schema', () => {
  class MyOtherEntity {
    @ApiField()
    propertyA!: boolean;

    propertyB!: string;
  }

  class MyEntity {
    propertyA!: boolean;

    propertyB!: string;

    @ApiField()
    propertyC!: number;

    @ApiField(() => MyOtherEntity)
    other!: MyOtherEntity;
  }

  expect(extractJsonSchema(MyEntity)).toEqual({
    type: 'object',
    additionalProperties: false,
    properties: {
      propertyC: {
        type: 'number',
      },
      other: {
        type: 'object',
        additionalProperties: false,
        properties: {
          propertyA: {
            type: 'boolean',
          },
        },
      },
    },
  });
});

test('extra json schema data', () => {
  class MyOtherEntity {
    @ApiField()
    @JsonSchemaData({ format: 'date-time' })
    propertyA!: Date;

    propertyB!: string;
  }

  class MyEntity {
    propertyA!: boolean;

    @ApiField()
    @JsonSchemaData({ type: 'integer' })
    propertyB!: number;

    @ApiField()
    @JsonSchemaData({ max: 1000 })
    propertyC!: number;

    @ApiField(() => MyOtherEntity)
    other!: MyOtherEntity;
  }

  expect(extractJsonSchema(MyEntity)).toEqual({
    type: 'object',
    additionalProperties: false,
    properties: {
      propertyB: {
        type: 'integer',
      },
      propertyC: {
        type: 'number',
        max: 1000,
      },
      other: {
        type: 'object',
        additionalProperties: false,
        properties: {
          propertyA: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
  });
});
