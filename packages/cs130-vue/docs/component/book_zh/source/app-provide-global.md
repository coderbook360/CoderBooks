# app.provide 全局注入

`app.provide` 让你可以在应用级别提供数据，任何组件都可以通过 `inject` 访问。这是跨层级传递数据的另一种方式，比全局属性更加优雅。

## 与 globalProperties 的对比

两种全局数据的方式：

```javascript
// globalProperties 方式
app.config.globalProperties.$http = axios

// 组件中使用
export default {
  mounted() {
    this.$http.get('/api/data')
  }
}
```

```javascript
// provide 方式
app.provide('http', axios)

// 组件中使用
import { inject } from 'vue'

export default {
  setup() {
    const http = inject('http')
    http.get('/api/data')
  }
}
```

`provide/inject` 的优势：
- 在 Composition API 中使用更自然
- 类型推导更好
- 可以提供响应式数据
- 依赖关系更明确

## 源码分析

`provide` 方法的实现：

```typescript
provide(key, value) {
  if (__DEV__ && (key as string | symbol) in context.provides) {
    warn(
      `App already provides property with key "${String(key)}". ` +
      `It will be overwritten with the new value.`
    )
  }
  
  context.provides[key] = value
  
  return app
}
```

非常简单——就是在 `context.provides` 对象上存储键值对。

## inject 如何查找

`inject` 的查找逻辑：

```typescript
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue?: T,
  treatDefaultAsFactory?: boolean
): T | undefined {
  const instance = currentInstance
  
  if (instance) {
    // 获取 provides 链
    const provides = 
      instance.parent == null
        ? instance.vnode.appContext.provides  // 根组件，使用应用上下文
        : instance.parent.provides            // 其他组件，使用父组件的 provides
    
    if (provides && (key as string | symbol) in provides) {
      return provides[key as string]
    }
    
    // 使用默认值
    if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue()
        : defaultValue
    }
    
    // 没有默认值，警告
    if (__DEV__) {
      warn(`injection "${String(key)}" not found.`)
    }
  }
}
```

对于根组件，直接从应用上下文查找。对于其他组件，从父组件的 `provides` 查找。

## 提供响应式数据

`provide` 可以提供响应式数据：

```javascript
import { reactive } from 'vue'

const theme = reactive({
  mode: 'dark',
  primaryColor: '#1890ff'
})

app.provide('theme', theme)
```

组件中注入后，数据保持响应式：

```javascript
import { inject } from 'vue'

const theme = inject('theme')

// 当 theme.mode 变化时，使用它的组件会自动更新
```

## 类型安全

使用 `InjectionKey` 实现类型安全：

```typescript
import { InjectionKey, Ref } from 'vue'

interface ThemeConfig {
  mode: 'light' | 'dark'
  primaryColor: string
}

const themeKey: InjectionKey<ThemeConfig> = Symbol('theme')

// 提供
app.provide(themeKey, {
  mode: 'dark',
  primaryColor: '#1890ff'
})

// 注入时类型自动推导
const theme = inject(themeKey)
// theme 的类型是 ThemeConfig | undefined
```

使用 Symbol 作为 key 还能避免命名冲突。

## 常见用例

**API 客户端**：

```javascript
const api = {
  get: (url) => fetch(url).then(r => r.json()),
  post: (url, data) => fetch(url, {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(r => r.json())
}

app.provide('api', api)

// 组件中
const api = inject('api')
await api.get('/users')
```

**主题配置**：

```javascript
const theme = reactive({
  mode: 'light',
  colors: {
    primary: '#1890ff',
    secondary: '#722ed1'
  }
})

app.provide('theme', theme)

// 组件中
const theme = inject('theme')
const primaryColor = computed(() => theme.colors.primary)
```

**国际化**：

```javascript
const i18n = {
  locale: ref('zh-CN'),
  messages: { ... },
  t(key) {
    return this.messages[this.locale.value][key]
  }
}

app.provide('i18n', i18n)

// 组件中
const { t } = inject('i18n')
t('hello')
```

**全局状态**（简单场景）：

```javascript
const globalState = reactive({
  user: null,
  isLoggedIn: false
})

app.provide('globalState', globalState)

// 组件中
const state = inject('globalState')
if (state.isLoggedIn) { ... }
```

对于复杂的状态管理，推荐使用 Pinia。

## 与组件级 provide 的关系

组件级的 `provide` 会覆盖应用级的：

```javascript
// 应用级
app.provide('theme', { mode: 'light' })

// 组件级（覆盖）
export default {
  setup() {
    provide('theme', { mode: 'dark' })
  }
}

// 子组件 inject 会得到 { mode: 'dark' }
```

这种覆盖机制让组件可以为其子树提供不同的值，形成局部的上下文。

## 默认值处理

当 inject 找不到对应的 provide 时：

```javascript
// 无默认值，会警告
const theme = inject('theme')

// 提供默认值
const theme = inject('theme', { mode: 'light' })

// 工厂函数形式（避免在没有使用时创建对象）
const theme = inject('theme', () => createDefaultTheme(), true)
```

第三个参数 `true` 表示第二个参数是工厂函数。

## 插件中的使用

插件经常使用 `app.provide`：

```javascript
const MyPlugin = {
  install(app, options) {
    const instance = createPluginInstance(options)
    
    // 提供实例
    app.provide('myPlugin', instance)
    
    // 也可以同时添加到 globalProperties
    app.config.globalProperties.$myPlugin = instance
  }
}
```

这样组件可以通过 `inject` 或 `this.$myPlugin` 两种方式访问。

## 小结

`app.provide` 在应用上下文中存储数据，任何组件都可以通过 `inject` 访问。相比 `globalProperties`，它在 Composition API 中使用更自然，类型支持更好。

提供响应式数据时，注入方也能获得响应式能力。使用 `InjectionKey` 可以实现类型安全。

应用级的 provide 可以被组件级的 provide 覆盖，形成局部上下文。插件经常使用 provide 来分发其实例。

在下一章中，我们将看看 `app.mount` 的完整挂载流程。
