# provide 实现

provide 函数用于在组件树中提供依赖，配合 inject 实现跨层级的数据传递。

## 基本用法

```typescript
import { provide, ref } from 'vue'

export default {
  setup() {
    const theme = ref('dark')
    provide('theme', theme)
  }
}
```

## provide 函数实现

```typescript
export function provide<T, K = InjectionKey<T> | string | number>(
  key: K,
  value: K extends InjectionKey<infer V> ? V : T
) {
  if (!currentInstance) {
    if (__DEV__) {
      warn(`provide() can only be used inside setup().`)
    }
  } else {
    let provides = currentInstance.provides
    
    // 默认情况下，实例继承父级的 provides
    // 但当需要提供自己的值时，需要创建自己的 provides 对象
    // 使用父级 provides 作为原型
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides
      
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    
    // 设置值
    provides[key as string] = value
  }
}
```

## 原型链继承

```typescript
// 父级 provides
const parentProvides = currentInstance.parent && currentInstance.parent.provides

// 如果当前 provides 就是父级的（还未修改过）
if (parentProvides === provides) {
  // 创建新对象，以父级 provides 为原型
  provides = currentInstance.provides = Object.create(parentProvides)
}
```

这种设计的优势：

1. 子组件自动继承父组件的 provides
2. 只有在需要时才创建新对象
3. 通过原型链查找实现高效访问

## 可视化原型链

```
Root provides: { theme: 'dark' }
       ↑ (prototype)
  App provides: { user: {...} }
       ↑ (prototype)
  Page provides: { api: {...} }
       ↑ (prototype)
  Component provides: {}  // 可以访问所有祖先的 provides
```

## 组件实例初始化

```typescript
export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary | null
): ComponentInternalInstance {
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext

  const instance: ComponentInternalInstance = {
    // ...
    
    // 继承父级或使用 appContext 的 provides
    provides: parent ? parent.provides : Object.create(appContext.provides),
    
    // ...
  }
  
  return instance
}
```

## app.provide 全局注入

```typescript
provide(key, value) {
  if (__DEV__ && (key as string | symbol) in context.provides) {
    warn(
      `App already provides property with key "${String(key)}". ` +
        `It will be overwritten with the new value.`
    )
  }
  context.provides[key as string | symbol] = value
  return app
}
```

全局 provide 存储在 appContext.provides 中。

## InjectionKey 类型安全

```typescript
import { InjectionKey, provide, inject } from 'vue'

interface User {
  name: string
  id: number
}

// 创建类型化的 key
const userKey: InjectionKey<User> = Symbol('user')

// 提供时类型检查
provide(userKey, { name: 'John', id: 1 })  // ✓
provide(userKey, { name: 'John' })  // ✗ 缺少 id

// 注入时自动推断类型
const user = inject(userKey)  // User | undefined
```

## InjectionKey 定义

```typescript
export interface InjectionKey<T> extends Symbol {}
```

InjectionKey 只是 Symbol 的扩展，用于携带类型信息。

## 响应式值

```typescript
import { provide, ref, reactive } from 'vue'

export default {
  setup() {
    // 提供 ref
    const count = ref(0)
    provide('count', count)
    
    // 提供 reactive
    const state = reactive({ user: null })
    provide('state', state)
    
    // 子组件修改会触发更新
  }
}
```

## 只读提供

```typescript
import { provide, ref, readonly } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const increment = () => count.value++
    
    // 提供只读引用
    provide('count', readonly(count))
    // 提供修改方法
    provide('increment', increment)
  }
}
```

## 覆盖父级提供

```typescript
// 父组件
provide('theme', 'light')

// 子组件
provide('theme', 'dark')  // 覆盖父级的值

// 孙组件
const theme = inject('theme')  // 'dark'
```

由于原型链的特性，子组件的 provide 会"遮蔽"父级的同名 provide。

## 与 Options API 集成

```typescript
export function applyOptions(instance: ComponentInternalInstance) {
  // ...
  
  if (provideOptions) {
    const provides = isFunction(provideOptions)
      ? provideOptions.call(publicThis)
      : provideOptions
      
    Reflect.ownKeys(provides).forEach(key => {
      provide(key, provides[key])
    })
  }
}
```

Options API 的 provide 选项也调用相同的 provide 函数。

## 使用示例

```typescript
// 根组件
import { provide, ref, readonly } from 'vue'

const ThemeProvider = {
  setup() {
    const theme = ref('light')
    const toggleTheme = () => {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
    }
    
    provide('theme', readonly(theme))
    provide('toggleTheme', toggleTheme)
    
    return () => h('div', { class: theme.value }, slots.default?.())
  }
}

// 深层子组件
import { inject } from 'vue'

const ThemedButton = {
  setup() {
    const theme = inject('theme')
    const toggle = inject('toggleTheme')
    
    return () => h('button', {
      class: `btn-${theme.value}`,
      onClick: toggle
    }, 'Toggle Theme')
  }
}
```

## 小结

provide 的核心实现：

1. **原型链继承**：Object.create(parentProvides) 实现高效继承
2. **懒创建**：只在需要时创建新的 provides 对象
3. **全局支持**：app.provide 设置全局依赖
4. **类型安全**：InjectionKey 提供 TypeScript 支持
5. **响应式**：可以提供 ref 和 reactive 值

provide 是 Vue 依赖注入系统的一半，下一章将分析 inject 的实现。
