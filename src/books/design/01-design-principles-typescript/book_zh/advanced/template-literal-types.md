# 模板字面量类型

**模板字面量类型（Template Literal Types）** 是 TypeScript 4.1 引入的特性。

它允许在类型层面使用模板字符串语法。

## 基本语法

```typescript
type Greeting = `Hello, ${string}`;

const a: Greeting = 'Hello, World';  // ✅
const b: Greeting = 'Hi, World';     // ❌ 错误
```

## 字面量组合

模板字面量可以组合多个字面量类型：

```typescript
type Size = 'small' | 'medium' | 'large';
type Color = 'red' | 'blue' | 'green';

type Style = `${Size}-${Color}`;
// 'small-red' | 'small-blue' | 'small-green' |
// 'medium-red' | 'medium-blue' | 'medium-green' |
// 'large-red' | 'large-blue' | 'large-green'

const style: Style = 'medium-blue';  // ✅
```

## 内置字符串操作类型

TypeScript 提供了内置的字符串操作类型：

```typescript
// Uppercase：转大写
type A = Uppercase<'hello'>;  // 'HELLO'

// Lowercase：转小写
type B = Lowercase<'HELLO'>;  // 'hello'

// Capitalize：首字母大写
type C = Capitalize<'hello'>;  // 'Hello'

// Uncapitalize：首字母小写
type D = Uncapitalize<'Hello'>;  // 'hello'
```

## 实际应用

### 1. 事件名生成

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<'click'>;     // 'onClick'
type ChangeEvent = EventName<'change'>;   // 'onChange'
type SubmitEvent = EventName<'submit'>;   // 'onSubmit'
```

### 2. getter/setter 生成

```typescript
type Getter<T extends string> = `get${Capitalize<T>}`;
type Setter<T extends string> = `set${Capitalize<T>}`;

interface Props {
  name: string;
  age: number;
}

type PropGetters = {
  [K in keyof Props as Getter<string & K>]: () => Props[K]
};
// { getName: () => string; getAge: () => number }

type PropSetters = {
  [K in keyof Props as Setter<string & K>]: (value: Props[K]) => void
};
// { setName: (value: string) => void; setAge: (value: number) => void }
```

### 3. CSS 类名

```typescript
type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';
type Spacing = 1 | 2 | 3 | 4 | 5;

type MarginClass = `m-${Spacing}` | `m${Breakpoint}-${Spacing}`;
// 'm-1' | 'm-2' | ... | 'msm-1' | 'mmd-1' | ...

type PaddingClass = `p-${Spacing}`;

const className: MarginClass = 'm-3';  // ✅
```

### 4. 路由路径

```typescript
type Routes = '/users' | '/posts' | '/comments';
type Methods = 'GET' | 'POST' | 'PUT' | 'DELETE';

type Endpoint = `${Methods} ${Routes}`;
// 'GET /users' | 'POST /users' | ... | 'DELETE /comments'

const endpoint: Endpoint = 'GET /users';  // ✅
```

### 5. 深度路径

```typescript
type PathOf<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends object
    ? PathOf<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`
}[keyof T & string];

interface User {
  name: string;
  address: {
    city: string;
    zip: string;
  };
}

type UserPaths = PathOf<User>;
// 'name' | 'address.city' | 'address.zip'
```

## 模式匹配

模板字面量可以用于模式匹配：

```typescript
// 提取前缀后的部分
type ExtractAfter<S extends string, Prefix extends string> = 
  S extends `${Prefix}${infer Rest}` ? Rest : never;

type A = ExtractAfter<'onClick', 'on'>;  // 'Click'
type B = ExtractAfter<'getData', 'get'>; // 'Data'
```

### 解析路由参数

```typescript
type ExtractParams<S extends string> = 
  S extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : S extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'
```

### 解析查询字符串

```typescript
type ParseQuery<S extends string> = 
  S extends `${infer Key}=${infer Value}&${infer Rest}`
    ? { [K in Key]: Value } & ParseQuery<Rest>
    : S extends `${infer Key}=${infer Value}`
      ? { [K in Key]: Value }
      : {};

type Query = ParseQuery<'name=john&age=30'>;
// { name: 'john'; age: '30' }
```

## 与映射类型结合

```typescript
type PropEvents<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (value: T[K]) => void
};

interface State {
  count: number;
  name: string;
}

type StateEvents = PropEvents<State>;
// {
//   onCountChange: (value: number) => void;
//   onNameChange: (value: string) => void;
// }
```

## 类型安全的字符串操作

```typescript
// 类型安全的 split
type Split<S extends string, D extends string> = 
  S extends `${infer Head}${D}${infer Tail}`
    ? [Head, ...Split<Tail, D>]
    : [S];

type A = Split<'a-b-c', '-'>;  // ['a', 'b', 'c']

// 类型安全的 join
type Join<T extends string[], D extends string> = 
  T extends []
    ? ''
    : T extends [infer F extends string]
      ? F
      : T extends [infer F extends string, ...infer R extends string[]]
        ? `${F}${D}${Join<R, D>}`
        : never;

type B = Join<['a', 'b', 'c'], '-'>;  // 'a-b-c'
```

## 实战示例：类型安全的 i18n

```typescript
type TranslationKeys = 
  | 'common.button.submit'
  | 'common.button.cancel'
  | 'user.profile.title'
  | 'user.profile.email';

type GetNamespace<K extends string> = 
  K extends `${infer NS}.${string}` ? NS : never;

type Namespace = GetNamespace<TranslationKeys>;
// 'common' | 'user'

function t(key: TranslationKeys): string {
  // 实现
  return '';
}

t('common.button.submit');  // ✅
t('invalid.key');           // ❌ 类型错误
```

## 总结

**模板字面量类型语法**：`` `${Type}` ``

**内置操作**：
- `Uppercase<S>` / `Lowercase<S>`
- `Capitalize<S>` / `Uncapitalize<S>`

**核心用途**：
- 生成事件名、方法名
- 路由路径类型
- CSS 类名类型
- 字符串模式匹配

**高级技巧**：
- 结合 `infer` 提取部分字符串
- 结合映射类型批量生成
- 递归处理复杂字符串

**记住**：模板字面量类型让 TypeScript 能够在类型层面操作字符串。
