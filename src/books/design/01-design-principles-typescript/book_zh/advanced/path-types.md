# 类型体操：路径类型提取

**路径类型（Path Types）** 可以从嵌套对象中提取所有可能的访问路径。

这在实现类型安全的深度访问、表单验证、i18n 等场景非常有用。

## 问题场景

```typescript
interface User {
  name: string;
  address: {
    city: string;
    zip: string;
  };
  contacts: {
    email: string;
    phone: string;
  };
}

// 我们想要一个类型表示所有可能的路径
// 'name' | 'address' | 'address.city' | 'address.zip' | 
// 'contacts' | 'contacts.email' | 'contacts.phone'
```

## 基础实现

```typescript
type Path<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? K | `${K}.${Path<T[K]>}`  // 对象：当前键 + 递归路径
          : K                          // 非对象：只有当前键
        : never
    }[keyof T]
  : never;

type UserPaths = Path<User>;
// 'name' | 'address' | 'address.city' | 'address.zip' | 
// 'contacts' | 'contacts.email' | 'contacts.phone'
```

## 根据路径获取类型

有了路径类型，我们还需要根据路径获取对应的值类型：

```typescript
type PathValue<T, P extends string> = 
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

type CityType = PathValue<User, 'address.city'>;  // string
type EmailType = PathValue<User, 'contacts.email'>;  // string
```

## 类型安全的 get 函数

```typescript
function get<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
  const keys = (path as string).split('.');
  let result: any = obj;
  for (const key of keys) {
    result = result[key];
  }
  return result;
}

const user: User = {
  name: 'John',
  address: { city: 'NYC', zip: '10001' },
  contacts: { email: 'john@example.com', phone: '123-456' }
};

const city = get(user, 'address.city');  // 类型：string
const name = get(user, 'name');           // 类型：string
// get(user, 'invalid.path');             // ❌ 类型错误
```

## 处理数组

数组路径需要特殊处理：

```typescript
interface Data {
  users: Array<{
    name: string;
    tags: string[];
  }>;
}

type ArrayPath<T> = T extends (infer U)[]
  ? `${number}` | `${number}.${Path<U>}`
  : T extends object
    ? {
        [K in keyof T]: K extends string
          ? T[K] extends any[]
            ? K | `${K}.${ArrayPath<T[K]>}`
            : T[K] extends object
              ? K | `${K}.${ArrayPath<T[K]>}`
              : K
          : never
      }[keyof T]
    : never;

type DataPaths = ArrayPath<Data>;
// 'users' | 'users.0' | 'users.0.name' | 'users.0.tags' | 'users.0.tags.0' | ...
```

## 实战应用

### 表单验证

```typescript
interface FormData {
  user: {
    name: string;
    email: string;
  };
  billing: {
    address: string;
    zip: string;
  };
}

type FormPath = Path<FormData>;

interface ValidationError {
  path: FormPath;
  message: string;
}

function setError(errors: ValidationError[], path: FormPath, message: string) {
  errors.push({ path, message });
}

// 类型安全的错误设置
setError([], 'user.email', 'Invalid email');     // ✅
setError([], 'billing.zip', 'Invalid zip code'); // ✅
// setError([], 'user.age', 'Invalid');          // ❌ 类型错误：路径不存在
```

### i18n 键类型

```typescript
interface Translations {
  common: {
    buttons: {
      submit: string;
      cancel: string;
    };
    errors: {
      required: string;
      invalid: string;
    };
  };
  pages: {
    home: {
      title: string;
    };
    about: {
      title: string;
    };
  };
}

type TranslationKey = Path<Translations>;
// 'common' | 'common.buttons' | 'common.buttons.submit' | ...

function t(key: TranslationKey): string {
  // 实现从翻译对象中获取值
  return '';
}

t('common.buttons.submit');  // ✅
t('pages.home.title');       // ✅
// t('invalid.key');         // ❌ 类型错误
```

### 状态管理

```typescript
interface AppState {
  user: {
    profile: {
      name: string;
      avatar: string;
    };
    settings: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  };
}

type StatePath = Path<AppState>;

// 类型安全的状态更新
function updateState<P extends StatePath>(
  state: AppState,
  path: P,
  value: PathValue<AppState, P>
): AppState {
  // 不可变更新实现
  const keys = (path as string).split('.');
  // ... 深拷贝并更新
  return state;
}

updateState(state, 'user.settings.theme', 'dark');  // ✅
updateState(state, 'user.profile.name', 'John');    // ✅
// updateState(state, 'user.settings.theme', 123);  // ❌ 类型错误
```

## 更精确的路径类型

只获取叶子路径（非对象属性）：

```typescript
type LeafPath<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${LeafPath<T[K]>}`  // 只递归，不包含中间路径
          : K
        : never
    }[keyof T]
  : never;

type UserLeafPaths = LeafPath<User>;
// 'name' | 'address.city' | 'address.zip' | 'contacts.email' | 'contacts.phone'
// 不包含 'address' 和 'contacts'
```

## 带前缀的路径

```typescript
type PrefixedPath<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? PrefixedPath<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never
    }[keyof T]
  : never;

// 添加前缀
type FormPaths = PrefixedPath<FormData, 'form.'>;
// 'form.user.name' | 'form.user.email' | 'form.billing.address' | 'form.billing.zip'
```

## 性能优化

深度嵌套可能导致类型推断变慢：

```typescript
// 限制递归深度
type PathWithDepth<T, D extends number = 4> = D extends 0
  ? never
  : T extends object
    ? {
        [K in keyof T]: K extends string
          ? T[K] extends object
            ? K | `${K}.${PathWithDepth<T[K], Prev<D>>}`
            : K
          : never
      }[keyof T]
    : never;

// Prev 类型用于递减
type Prev<N extends number> = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9][N];
```

## 总结

**路径类型核心**：
- 递归遍历对象结构
- 使用模板字面量拼接路径
- `PathValue` 根据路径获取类型

**使用场景**：
- 类型安全的 `get`/`set` 函数
- 表单验证路径
- i18n 翻译键
- 状态管理路径

**关键技巧**：
- 处理数组索引
- 区分叶子路径和中间路径
- 控制递归深度

**记住**：路径类型让深度访问变得类型安全。
