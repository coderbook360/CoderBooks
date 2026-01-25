# inject 实现

inject 函数用于获取祖先组件通过 provide 提供的值。它利用原型链实现高效的跨层级查找。

## 基本用法

```typescript
import { inject } from 'vue'

export default {
  setup() {
    const theme = inject('theme')
    const count = inject('count', 0)  // 带默认值
    
    return { theme, count }
  }
}
```

## inject 函数实现

```typescript
export function inject<T>(key: InjectionKey<T> | string): T | undefined
export function inject<T>(key: InjectionKey<T> | string, defaultValue: T, treatDefaultAsFactory?: false): T
export function inject<T>(key: InjectionKey<T> | string, defaultValue: T | (() => T), treatDefaultAsFactory: true): T
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: unknown,
  treatDefaultAsFactory = false
) {
  // 获取当前实例（支持 setup 和 functional 组件）
  const instance = currentInstance || currentRenderingInstance
  
  // SSR 中也支持 app-level provides
  if (instance || currentApp) {
    // 确定要查找的 provides 对象
    const provides = instance
      ? instance.parent == null
        ? instance.vnode.appContext && instance.vnode.appContext.provides
        : instance.parent.provides
      : currentApp!._context.provides

    if (provides && (key as string | symbol) in provides) {
      return provides[key as string]
    } else if (arguments.length > 1) {
      // 有默认值
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && instance.proxy)
        : defaultValue
    } else if (__DEV__) {
      warn(`injection "${String(key)}" not found.`)
    }
  } else if (__DEV__) {
    warn(`inject() can only be used inside setup() or functional components.`)
  }
}
```

## 查找逻辑

```typescript
const provides = instance
  ? instance.parent == null
    // 根组件：使用 appContext.provides
    ? instance.vnode.appContext && instance.vnode.appContext.provides
    // 非根组件：使用父级的 provides
    : instance.parent.provides
  : currentApp!._context.provides
```

关键点：inject 从父级的 provides 开始查找，而不是自己的。这确保了组件不会 inject 到自己 provide 的值。

## 原型链查找

```typescript
if (provides && (key as string | symbol) in provides) {
  return provides[key as string]
}
```

由于 provides 对象通过 Object.create(parentProvides) 创建，`in` 操作符会沿原型链查找。

```
祖先 provides: { theme: 'dark' }
     ↑ (prototype)
父级 provides: { user: {...} }
     ↑ (查找方向)
当前组件 inject('theme') → 找到 'dark'
```

## 默认值处理

```typescript
// 直接值
const count = inject('count', 0)

// 工厂函数
const config = inject('config', () => createDefaultConfig(), true)
```

实现：

```typescript
if (arguments.length > 1) {
  return treatDefaultAsFactory && isFunction(defaultValue)
    ? defaultValue.call(instance && instance.proxy)
    : defaultValue
}
```

## 类型推断

```typescript
import { inject, InjectionKey } from 'vue'

interface Theme {
  primary: string
  secondary: string
}

const themeKey: InjectionKey<Theme> = Symbol('theme')

// 无默认值 - 可能为 undefined
const theme1 = inject(themeKey)  // Theme | undefined

// 有默认值 - 一定有值
const theme2 = inject(themeKey, { primary: '#000', secondary: '#fff' })  // Theme

// 工厂函数默认值
const theme3 = inject(themeKey, () => ({ primary: '#000', secondary: '#fff' }), true)  // Theme
```

## 函数式组件中的 inject

```typescript
const provides = instance
  ? instance.parent == null
    ? instance.vnode.appContext && instance.vnode.appContext.provides
    : instance.parent.provides
  : currentApp!._context.provides
```

即使在函数式组件中，inject 也能正常工作。

## 必须注入

```typescript
// 自定义 hook 确保注入存在
function useTheme() {
  const theme = inject(themeKey)
  if (!theme) {
    throw new Error('Theme not provided')
  }
  return theme  // Theme（非 undefined）
}
```

## 与 Options API 集成

```typescript
export function resolveInjections(
  injectOptions: ComponentInjectOptions,
  ctx: any,
  checkDuplicateProperties = NOOP
) {
  if (isArray(injectOptions)) {
    injectOptions = normalizeInject(injectOptions)!
  }
  
  for (const key in injectOptions) {
    const opt = injectOptions[key]
    let injected: unknown
    
    if (isObject(opt)) {
      if ('default' in opt) {
        injected = inject(
          opt.from || key,
          opt.default,
          true /* 作为工厂函数处理 */
        )
      } else {
        injected = inject(opt.from || key)
      }
    } else {
      injected = inject(opt)
    }
    
    if (isRef(injected)) {
      // 解包 ref 到 ctx
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => (injected as Ref).value,
        set: v => ((injected as Ref).value = v)
      })
    } else {
      ctx[key] = injected
    }
  }
}
```

## Options API inject 语法

```typescript
// 数组形式
inject: ['theme', 'user']

// 对象形式
inject: {
  theme: 'theme',
  user: {
    from: 'user',
    default: () => ({ name: 'Guest' })
  }
}
```

## hasInjectionContext

检查是否在可注入的上下文中：

```typescript
export function hasInjectionContext(): boolean {
  return !!(currentInstance || currentRenderingInstance || currentApp)
}
```

用于在可组合函数中检查环境。

## 使用示例

```typescript
// 类型安全的依赖注入
import { inject, provide, InjectionKey, ref, readonly } from 'vue'

interface AuthContext {
  user: Ref<User | null>
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

const AuthKey: InjectionKey<AuthContext> = Symbol('auth')

// 提供者
const AuthProvider = {
  setup(props, { slots }) {
    const user = ref<User | null>(null)
    
    const login = async (credentials: Credentials) => {
      user.value = await api.login(credentials)
    }
    
    const logout = () => {
      user.value = null
    }
    
    provide(AuthKey, {
      user: readonly(user),
      login,
      logout
    })
    
    return () => slots.default?.()
  }
}

// 消费者 hook
function useAuth(): AuthContext {
  const auth = inject(AuthKey)
  if (!auth) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return auth
}

// 使用
const { user, login, logout } = useAuth()
```

## 小结

inject 的核心实现：

1. **原型链查找**：利用原型链实现高效的跨层级查找
2. **从父级开始**：inject 从父级 provides 查找，避免自我注入
3. **默认值支持**：支持直接值和工厂函数
4. **类型安全**：InjectionKey 提供完整类型推断
5. **上下文检查**：仅在 setup 或函数式组件中可用

provide/inject 是 Vue 依赖注入系统的核心实现。

下一章将分析生命周期钩子的注册机制。
