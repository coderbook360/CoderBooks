# app.use 插件安装

Vue 的插件系统让第三方库可以扩展 Vue 的功能。Vue Router、Pinia、Vue I18n——这些生态中的核心库都是通过插件机制集成的。`app.use` 是安装插件的入口。

## 插件是什么

插件本质上是一个带有 `install` 方法的对象，或者直接是一个函数：

```javascript
// 对象形式
const myPlugin = {
  install(app, options) {
    // 扩展 app
  }
}

// 函数形式
function myPlugin(app, options) {
  // 扩展 app
}

// 使用
app.use(myPlugin, { someOption: true })
```

`install` 方法接收两个参数：应用实例和用户传入的选项。通过应用实例，插件可以注册全局组件、添加全局属性、注入依赖等。

## 源码分析

`use` 方法定义在 `createApp` 返回的应用对象上：

```typescript
use(plugin: Plugin, ...options: any[]) {
  // 检查是否已安装
  if (installedPlugins.has(plugin)) {
    __DEV__ && warn(`Plugin has already been applied to target app.`)
  } else if (plugin && isFunction(plugin.install)) {
    // 对象形式的插件
    installedPlugins.add(plugin)
    plugin.install(app, ...options)
  } else if (isFunction(plugin)) {
    // 函数形式的插件
    installedPlugins.add(plugin)
    plugin(app, ...options)
  } else if (__DEV__) {
    warn(
      `A plugin must either be a function or an object with an "install" ` +
      `function.`
    )
  }
  return app
}
```

代码逻辑很清晰：

1. 检查插件是否已安装（通过 Set 去重）
2. 如果插件是对象且有 `install` 方法，调用 `install`
3. 如果插件是函数，直接调用
4. 返回 `app`，支持链式调用

`installedPlugins` 是在 `createApp` 内部创建的 Set，记录已安装的插件：

```typescript
const installedPlugins = new Set()
```

## 防止重复安装

插件只会安装一次。如果尝试重复安装，开发环境会给出警告：

```javascript
app.use(myPlugin)
app.use(myPlugin)  // 警告：Plugin has already been applied
```

这防止了插件被意外多次安装导致的问题。

## 插件能做什么

通过 `app` 参数，插件可以：

**注册全局组件**：

```javascript
const MyPlugin = {
  install(app) {
    app.component('MyButton', ButtonComponent)
    app.component('MyInput', InputComponent)
  }
}
```

**添加全局属性**：

```javascript
const MyPlugin = {
  install(app) {
    app.config.globalProperties.$http = axios
    app.config.globalProperties.$notify = notify
  }
}
```

**提供全局依赖**：

```javascript
const MyPlugin = {
  install(app, options) {
    const api = createApi(options.baseUrl)
    app.provide('api', api)
  }
}

// 组件中
const api = inject('api')
```

**注册全局指令**：

```javascript
const MyPlugin = {
  install(app) {
    app.directive('focus', {
      mounted(el) {
        el.focus()
      }
    })
  }
}
```

**添加全局 mixin**：

```javascript
const MyPlugin = {
  install(app) {
    app.mixin({
      created() {
        // 所有组件都会执行
      }
    })
  }
}
```

## 实际案例：Vue Router

Vue Router 的插件结构：

```typescript
// 简化版
export function createRouter(options: RouterOptions): Router {
  const router: Router = {
    // ... router 实例
    
    install(app: App) {
      const router = this
      
      // 注册全局组件
      app.component('RouterLink', RouterLink)
      app.component('RouterView', RouterView)
      
      // 添加全局属性
      app.config.globalProperties.$router = router
      app.config.globalProperties.$route = toRef(router, 'currentRoute')
      
      // 提供依赖
      app.provide(routerKey, router)
      app.provide(routeLocationKey, shallowRef(router.currentRoute.value))
      
      // 全局 beforeEach 守卫
      // ...
    }
  }
  
  return router
}
```

使用时：

```javascript
const router = createRouter({
  history: createWebHistory(),
  routes: [...]
})

app.use(router)
```

`app.use(router)` 实际上调用了 `router.install(app)`，完成了组件注册、属性注入、依赖提供等工作。

## 实际案例：Pinia

Pinia 的插件结构：

```typescript
// 简化版
export function createPinia(): Pinia {
  const pinia: Pinia = {
    install(app: App) {
      pinia._a = app
      
      // 提供 pinia 实例
      app.provide(piniaSymbol, pinia)
      
      // 添加 $pinia 属性（Options API 支持）
      app.config.globalProperties.$pinia = pinia
      
      // 注册 devtools
      if (__USE_DEVTOOLS__ && IS_CLIENT) {
        registerPiniaDevtools(app, pinia)
      }
    },
    
    use(plugin) {
      // Pinia 自己的插件系统
      this._p.push(plugin)
      return this
    },
    
    // ...
  }
  
  return pinia
}
```

## 插件的类型定义

```typescript
export type Plugin<Options = any[]> = 
  | (PluginInstallFunction<Options> & { install?: PluginInstallFunction<Options> })
  | { install: PluginInstallFunction<Options> }

type PluginInstallFunction<Options> = Options extends unknown[]
  ? (app: App, ...options: Options) => any
  : (app: App, options: Options) => any
```

这个类型允许插件是函数或带 `install` 方法的对象，并支持类型化的选项。

## 插件选项的传递

`use` 方法接收额外的参数，传递给插件：

```javascript
app.use(myPlugin, { theme: 'dark', language: 'zh' })

// 插件中
const MyPlugin = {
  install(app, options) {
    console.log(options.theme)    // 'dark'
    console.log(options.language) // 'zh'
  }
}
```

选项的类型可以通过泛型约束：

```typescript
interface MyPluginOptions {
  theme: 'light' | 'dark'
  language: string
}

const myPlugin: Plugin<[MyPluginOptions]> = {
  install(app, options) {
    // options 类型是 MyPluginOptions
  }
}
```

## 插件的最佳实践

**提供类型定义**。让 TypeScript 用户获得良好的开发体验：

```typescript
// 扩展 ComponentCustomProperties
declare module 'vue' {
  interface ComponentCustomProperties {
    $myPlugin: MyPluginInstance
  }
}
```

**支持按需引入**。大型插件应该支持 tree-shaking：

```javascript
// 不好的做法：全部注册
app.use(myUILibrary)

// 好的做法：按需引入
import { Button, Input } from 'my-ui-library'
app.component('MyButton', Button)
app.component('MyInput', Input)
```

**提供配置选项**。让用户可以自定义插件行为：

```javascript
app.use(myPlugin, {
  prefix: 'my',
  theme: 'dark',
  locale: 'zh-CN'
})
```

**遵循 Vue 的约定**。使用 provide/inject 而不是全局变量，使用 globalProperties 而不是 Vue.prototype。

## 小结

`app.use` 提供了标准化的插件安装机制。插件可以是带 `install` 方法的对象或函数，通过应用实例可以注册全局组件、添加全局属性、提供依赖等。

Vue 生态中的核心库如 Vue Router、Pinia 都通过插件机制集成。理解插件系统有助于正确使用这些库，也有助于开发自己的插件。

在下一章中，我们将看看 `app.component` 是如何注册全局组件的。
