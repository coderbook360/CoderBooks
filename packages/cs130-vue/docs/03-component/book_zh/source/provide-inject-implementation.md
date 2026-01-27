# provide/inject 实现

`provide/inject` 实现了跨层级的依赖注入。祖先组件提供数据，后代组件注入使用，无需逐层传递 props。

## 基本用法

```javascript
// 祖先组件
const theme = ref('dark')
provide('theme', theme)

// 后代组件
const theme = inject('theme')
```

## provide 实现

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
    
    // 默认继承父组件的 provides
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides
    
    if (parentProvides === provides) {
      // 第一次 provide，创建自己的 provides 对象
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    
    provides[key as string] = value
  }
}
```

关键点：
- 使用原型链继承父组件的 provides
- 第一次 provide 时创建新对象，避免污染父组件

## 原型链继承

```javascript
// 初始状态
child.provides === parent.provides  // 共享引用

// 第一次 provide 后
child.provides = Object.create(parent.provides)
child.provides['key'] = value
```

通过原型链，子组件可以访问祖先的所有 provides。

## inject 实现

```typescript
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: unknown,
  treatDefaultAsFactory = false
) {
  // 获取当前实例或渲染实例
  const instance = currentInstance || currentRenderingInstance
  
  if (instance) {
    // 从父组件或根的 provides 获取
    const provides =
      instance.parent == null
        ? instance.vnode.appContext && instance.vnode.appContext.provides
        : instance.parent.provides

    if (provides && (key as string | symbol) in provides) {
      return provides[key as string]
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance.proxy)
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
const provides =
  instance.parent == null
    ? instance.vnode.appContext && instance.vnode.appContext.provides
    : instance.parent.provides
```

- 有父组件：从父组件的 provides 查找（原型链继承）
- 无父组件（根组件）：从 appContext.provides 查找

## 默认值

```javascript
// 静态默认值
const theme = inject('theme', 'light')

// 工厂函数默认值
const theme = inject('theme', () => computeDefault(), true)
```

源码处理：

```typescript
if (arguments.length > 1) {
  return treatDefaultAsFactory && isFunction(defaultValue)
    ? defaultValue.call(instance.proxy)
    : defaultValue
}
```

## InjectionKey

类型安全的键：

```typescript
import type { InjectionKey } from 'vue'

interface User {
  name: string
  age: number
}

const userKey: InjectionKey<User> = Symbol('user')

// 提供
provide(userKey, { name: 'Vue', age: 10 })

// 注入（自动推导类型为 User）
const user = inject(userKey)
```

## 组件实例的 provides 初始化

```typescript
// createComponentInstance 中
instance.provides = parent ? parent.provides : Object.create(appContext.provides)
```

初始时直接引用父组件的 provides。

## 应用级 provide

```javascript
const app = createApp(App)
app.provide('globalKey', globalValue)
```

存储在 `appContext.provides`：

```typescript
provide(key, value) {
  context.provides[key as string | symbol] = value
  return app
}
```

## 响应式 provide

提供响应式数据：

```javascript
// 祖先组件
const count = ref(0)
provide('count', count)

// 后代组件
const count = inject('count')
// count 是 Ref，响应式的
```

修改会自动更新：

```javascript
// 祖先组件
count.value++

// 后代组件会响应这个变化
```

## readonly 保护

防止后代修改：

```javascript
// 祖先组件
const count = ref(0)
provide('count', readonly(count))

// 后代组件
const count = inject('count')
count.value++  // 警告：尝试修改只读值
```

## 配合 computed

计算属性也可以 provide：

```javascript
const state = reactive({ count: 0 })
provide('doubleCount', computed(() => state.count * 2))
```

## 典型应用

### 主题系统

```javascript
// ThemeProvider.vue
const theme = ref('light')
provide('theme', {
  current: theme,
  toggle: () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }
})

// 使用组件
const { current, toggle } = inject('theme')
```

### 表单上下文

```javascript
// Form.vue
provide('form', {
  values: reactive({}),
  errors: reactive({}),
  register: (name, rules) => { /* ... */ },
  validate: () => { /* ... */ }
})

// FormItem.vue
const form = inject('form')
form.register(props.name, props.rules)
```

### 路由

```javascript
// 路由库的实现
provide(routerKey, router)
provide(routeLocationKey, currentRoute)

// 组件中
const router = inject(routerKey)
const route = inject(routeLocationKey)
```

## hasInjectionContext

检查是否在注入上下文中：

```typescript
export function hasInjectionContext() {
  return !!(currentInstance || currentRenderingInstance || currentApp)
}
```

用于库开发中判断是否可以调用 inject。

## 性能考虑

原型链查找效率：

```javascript
// 三层组件
grandparent.provides = { a: 1 }
parent.provides = Object.create(grandparent.provides)
parent.provides.b = 2
child.provides = Object.create(parent.provides)
child.provides.c = 3

// 查找 'a' 需要遍历原型链
// 但原型链通常不深，性能影响小
```

## 与 props 对比

| 特性 | props | provide/inject |
|------|-------|----------------|
| 层级 | 直接父子 | 跨任意层级 |
| 显式性 | 明确声明 | 隐式依赖 |
| 调试 | 容易追踪 | 较难追踪 |
| 适用场景 | 组件接口 | 全局状态、主题 |

## 注意事项

**避免过度使用**：

```javascript
// 不好：用 provide/inject 替代所有 props
provide('title', props.title)
provide('content', props.content)

// 好：用于真正需要跨层级的数据
provide('theme', theme)
provide('locale', locale)
```

**明确依赖**：

```javascript
// 子组件应该明确依赖
const theme = inject('theme')
if (!theme) {
  throw new Error('Component must be used inside ThemeProvider')
}
```

## 小结

provide/inject 的实现：

1. **原型链继承**：子组件通过原型链访问祖先的 provides
2. **惰性创建**：第一次 provide 时创建新对象
3. **默认值**：支持静态值和工厂函数
4. **类型安全**：InjectionKey 提供类型推导

这个机制适用于主题、国际化、表单上下文等跨层级共享的场景。

下一章将进入生命周期部分，分析生命周期钩子的注册机制。
