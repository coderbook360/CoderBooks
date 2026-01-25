# app.component 全局组件

全局组件是在整个应用范围内可用的组件。通过 `app.component` 注册后，无需在每个使用的地方导入，可以直接在模板中使用。

## 基本用法

注册全局组件：

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import Button from './components/Button.vue'

const app = createApp(App)

// 注册全局组件
app.component('MyButton', Button)

app.mount('#app')
```

注册后，可以在任何组件的模板中使用：

```vue
<template>
  <MyButton>点击我</MyButton>
</template>
```

## 源码分析

`component` 方法定义在 `createApp` 返回的应用对象上：

```typescript
component(name: string, component?: Component): any {
  if (__DEV__) {
    validateComponentName(name, context.config)
  }
  
  if (!component) {
    // 获取已注册的组件
    return context.components[name]
  }
  
  if (__DEV__ && context.components[name]) {
    warn(`Component "${name}" has already been registered in target app.`)
  }
  
  // 注册组件
  context.components[name] = component
  
  return app
}
```

这个方法有两种用法：

**注册组件**（传入两个参数）：

```javascript
app.component('Button', ButtonComponent)
// 等同于
context.components['Button'] = ButtonComponent
```

**获取组件**（只传入名称）：

```javascript
const Button = app.component('Button')
// 等同于
const Button = context.components['Button']
```

## 组件名验证

开发环境会验证组件名：

```typescript
function validateComponentName(name: string, config: AppConfig) {
  const appIsNativeTag = config.isNativeTag || NO
  
  // 检查是否是保留标签
  if (isBuiltInTag(name) || appIsNativeTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component id: ' + name
    )
  }
}

// 内置标签
const isBuiltInTag = makeMap('slot,component')
```

不能使用 HTML 原生标签名或 Vue 保留字作为组件名。

## 组件解析

当模板中使用组件时，需要解析组件名到实际的组件对象。`resolveComponent` 处理这个逻辑：

```typescript
export function resolveComponent(
  name: string,
  maybeSelfReference?: boolean
): ConcreteComponent | string {
  return resolveAsset(COMPONENTS, name, true, maybeSelfReference) || name
}

function resolveAsset(
  type: AssetTypes,
  name: string,
  warnMissing = true,
  maybeSelfReference = false
) {
  const instance = currentRenderingInstance || currentInstance
  
  if (instance) {
    const Component = instance.type
    
    // 1. 检查组件自身
    if (type === COMPONENTS) {
      const selfName = getComponentName(Component)
      if (
        selfName &&
        (selfName === name || selfName === camelize(name) || selfName === capitalize(camelize(name)))
      ) {
        return Component
      }
    }
    
    // 2. 检查局部注册
    const res = resolve(Component[type] || (Component as ComponentOptions).extends?.[type], name)
    if (res) return res
    
    // 3. 检查全局注册
    const appContext = instance.appContext
    if (type === COMPONENTS) {
      return resolve(appContext.components, name)
    }
  }
  
  // 未找到
  if (__DEV__ && warnMissing) {
    warn(`Failed to resolve ${type.slice(0, -1)}: ${name}`)
  }
}
```

解析顺序是：
1. 检查组件自身（用于递归组件）
2. 检查局部注册（`components` 选项）
3. 检查全局注册（`appContext.components`）

## 名称格式

组件名支持多种格式，解析时会尝试匹配：

```typescript
function resolve(registry: Record<string, any> | undefined, name: string) {
  return (
    registry &&
    (registry[name] ||
      registry[camelize(name)] ||
      registry[capitalize(camelize(name))])
  )
}
```

这意味着以下注册和使用方式都是等价的：

```javascript
// 注册
app.component('my-button', Button)
app.component('myButton', Button)
app.component('MyButton', Button)

// 使用（都能匹配）
<my-button />
<myButton />
<MyButton />
```

推荐使用 PascalCase 注册，使用时也用 PascalCase 或 kebab-case。

## 与局部注册的比较

**全局注册**：

```javascript
// main.js
app.component('Button', Button)

// 任何组件中直接使用
<Button />
```

**局部注册**：

```vue
<script setup>
import Button from './Button.vue'
</script>

<template>
  <Button />
</template>
```

局部注册的优势是更好的 tree-shaking——未使用的组件不会被打包。全局注册的组件即使未使用也会被打包。

## 批量注册

如果需要注册多个全局组件，可以循环处理：

```javascript
import * as components from './components'

for (const [name, component] of Object.entries(components)) {
  app.component(name, component)
}
```

或者封装成插件：

```javascript
const MyComponents = {
  install(app) {
    app.component('Button', Button)
    app.component('Input', Input)
    app.component('Card', Card)
  }
}

app.use(MyComponents)
```

## 类型支持

为全局组件添加类型：

```typescript
// components.d.ts
import Button from './components/Button.vue'

declare module 'vue' {
  export interface GlobalComponents {
    MyButton: typeof Button
  }
}
```

这样在模板中使用 `<MyButton>` 时，TypeScript 可以提供正确的 prop 提示。

## 命名约定

常见的命名约定：

**PascalCase**（推荐）：

```javascript
app.component('MyButton', Button)
// 使用
<MyButton />
```

**kebab-case**：

```javascript
app.component('my-button', Button)
// 使用
<my-button />
```

**带前缀**（组件库常用）：

```javascript
app.component('ElButton', Button)    // Element Plus
app.component('AButton', Button)     // Ant Design Vue
app.component('VBtn', Button)        // Vuetify
```

前缀可以避免与原生 HTML 标签冲突，也能区分不同来源的组件。

## 性能考虑

全局组件的注册发生在应用启动时，不影响运行时性能。但有两点需要注意：

**打包体积**：全局注册的组件不能被 tree-shake。如果一个组件库有 50 个组件，全局注册会把所有组件都打包进来。

**解析开销**：每次使用组件都需要在注册表中查找。虽然这个开销很小，但局部注册（编译时已知组件引用）可以跳过这个查找。

对于大型应用，推荐按需引入和局部注册。全局注册适合那些确实在大量地方使用的基础组件。

## 小结

`app.component` 提供了全局组件的注册和获取功能。组件存储在应用上下文的 `components` 对象中，解析时按名称查找。

组件名支持多种格式，解析时会尝试匹配 kebab-case、camelCase、PascalCase。推荐使用 PascalCase 注册，保持一致性。

全局注册适合高频使用的基础组件，局部注册更利于 tree-shaking。在下一章中，我们将看看 `app.directive` 是如何注册全局指令的。
