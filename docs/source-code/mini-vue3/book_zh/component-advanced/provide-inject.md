# provide/inject 依赖注入

多层级组件如何共享数据？Props 逐层透传太繁琐，全局状态又太重。**provide/inject 提供了优雅的解决方案。**

本章将分析 provide/inject 的实现原理。**其核心思想是利用 JavaScript 原型链实现高效的跨级数据传递——这是一个非常精妙的设计。**

## 问题：Props 透传之痛

假设有这样的组件层级：

```
App
 └── Layout
      └── Sidebar
           └── UserInfo  <- 需要用户数据
```

如果用 Props 传递：

```vue
<App :user="user">
  <Layout :user="user">
    <Sidebar :user="user">
      <UserInfo :user="user" />
    </Sidebar>
  </Layout>
</App>
```

每一层都要声明和传递 `user`，这就是"Props Drilling"——繁琐且难维护。

provide/inject 的方案：

```javascript
// App.vue
provide('user', user)

// UserInfo.vue (任意层级)
const user = inject('user')
```

## 核心思路：原型链

provide/inject 的实现利用了 JavaScript 原型链：

```javascript
// 根组件
const appProvides = { theme: 'dark' }

// 中间组件（无 provide）
childInstance.provides = appProvides  // 直接引用父级

// 孙组件（有 provide）
grandChild.provides = Object.create(childInstance.provides)
grandChild.provides.locale = 'zh-CN'

// 查找 'theme'：
grandChild.provides.theme  // 原型链向上查找，找到 'dark'
```

利用原型链的好处：
1. 查找自动向上冒泡
2. 内存高效——无 provide 的组件不创建新对象
3. 子级可以覆盖父级的同名值

## provide 实现

```javascript
function provide(key, value) {
  const currentInstance = getCurrentInstance()
  
  if (!currentInstance) {
    if (__DEV__) {
      console.warn('provide() can only be used inside setup()')
    }
    return
  }
  
  let provides = currentInstance.provides
  const parentProvides = currentInstance.parent?.provides
  
  // 关键：第一次 provide 时创建新对象
  if (provides === parentProvides) {
    // 以父级 provides 为原型创建新对象
    provides = currentInstance.provides = Object.create(parentProvides)
  }
  
  provides[key] = value
}
```

核心逻辑：
1. 获取当前实例的 provides
2. 如果与父级相同（还未 provide 过），创建新对象
3. 新对象以父级 provides 为原型
4. 设置键值

为什么要 `Object.create(parentProvides)`？

```javascript
// 如果直接修改：
provides === parentProvides  // true
provides[key] = value        // 污染了父级！

// 使用 Object.create：
provides = Object.create(parentProvides)
provides[key] = value        // 只影响当前组件
```

## inject 实现

```javascript
function inject(key, defaultValue, treatDefaultAsFactory = false) {
  const instance = getCurrentInstance()
  
  if (!instance) {
    if (__DEV__) {
      console.warn('inject() can only be used inside setup()')
    }
    return
  }
  
  // 从父级开始查找（跳过自己的 provides）
  const provides = instance.parent?.provides
  
  if (provides && key in provides) {
    // 利用原型链查找
    return provides[key]
  } else if (arguments.length > 1) {
    // 有默认值
    return treatDefaultAsFactory && isFunction(defaultValue)
      ? defaultValue()
      : defaultValue
  } else if (__DEV__) {
    console.warn(`injection "${String(key)}" not found.`)
  }
}
```

关键点：
1. 从父级的 provides 开始查找
2. `key in provides` 会沿原型链查找
3. 支持默认值和工厂函数

## 组件实例初始化

创建组件实例时初始化 provides：

```javascript
function createComponentInstance(vnode, parent) {
  const instance = {
    vnode,
    parent,
    // 继承父级的 provides
    provides: parent ? parent.provides : Object.create(null),
    // ...
  }
  
  return instance
}
```

初始时，子组件的 provides 直接引用父级，共享同一个对象。只有调用 `provide()` 时才会创建新对象。

## 应用级 provide

根组件可以通过 app.provide 注入：

```javascript
const app = createApp(App)
app.provide('globalConfig', config)
```

实现：

```javascript
function createAppContext() {
  return {
    provides: Object.create(null),
    // ...
  }
}

app.provide = (key, value) => {
  context.provides[key] = value
  return app
}
```

根组件继承应用级 provides：

```javascript
function createComponentInstance(vnode, parent) {
  const appContext = vnode.appContext
  
  const instance = {
    provides: parent 
      ? parent.provides 
      : Object.create(appContext.provides),  // 以 app provides 为原型
    // ...
  }
}
```

## 响应式数据

provide/inject 本身不处理响应性，但可以传递响应式数据：

```javascript
// 提供响应式数据
const count = ref(0)
provide('count', count)

// 注入后仍是响应式
const count = inject('count')
watch(count, (val) => console.log(val))
```

提供 readonly 保护：

```javascript
const state = reactive({ count: 0 })
provide('state', readonly(state))  // 子组件不能修改

// 提供修改方法
provide('increment', () => state.count++)
```

## 类型安全：InjectionKey

TypeScript 中使用 Symbol 作为 key 实现类型安全：

```typescript
import { InjectionKey, provide, inject } from 'vue'

interface User {
  name: string
  age: number
}

// 定义类型化的 key
const userKey: InjectionKey<User> = Symbol('user')

// provide 时类型检查
provide(userKey, { name: 'John', age: 30 })

// inject 时自动推断类型
const user = inject(userKey)
// user 类型是 User | undefined
```

InjectionKey 的定义：

```typescript
interface InjectionKey<T> extends Symbol {}
```

本质上就是 Symbol，但携带了泛型类型信息。

## 常见使用模式

### 主题切换

```javascript
// 根组件
const theme = ref('light')
provide('theme', theme)
provide('toggleTheme', () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
})

// 子组件
const theme = inject('theme')
const toggleTheme = inject('toggleTheme')
```

### 状态管理

```javascript
// store.js
export function createStore() {
  const state = reactive({ /* ... */ })
  const actions = { /* ... */ }
  
  return { state: readonly(state), actions }
}

// App.vue
const store = createStore()
provide('store', store)

// 任意子组件
const { state, actions } = inject('store')
```

### 配置注入

```javascript
// 提供默认配置
provide('config', {
  api: '/api',
  timeout: 3000
})

// 子组件覆盖部分配置
provide('config', {
  ...inject('config'),
  timeout: 5000
})
```

## 与 Props 的对比

| 特性 | Props | provide/inject |
|------|-------|----------------|
| 传递方向 | 父 → 子（一级） | 祖先 → 后代（跨级） |
| 显式性 | 显式声明 | 隐式依赖 |
| 响应性 | 自动响应式 | 需手动传递响应式数据 |
| 类型推断 | 完善 | 需要 InjectionKey |
| 适用场景 | 组件接口 | 全局配置、主题 |

## 本章小结

本章分析了 provide/inject 的实现：

- **原型链机制**：利用 Object.create 构建原型链
- **provide**：第一次调用时创建新对象，以父级为原型
- **inject**：通过 `in` 操作符沿原型链查找
- **初始化**：子组件默认共享父级 provides
- **响应性**：需要手动传递 ref 或 reactive
- **类型安全**：使用 InjectionKey 实现

provide/inject 解决了跨级组件通信问题，是构建可复用组件库的重要工具。但要注意，过度使用会使组件间依赖不够显式，增加维护成本。

下一章，我们将分析异步组件和 Suspense 的实现。
