# Tree-shaking 与模块化设计

Tree-shaking 是现代前端构建工具的重要优化手段，Vue3 从架构层面拥抱了这一机制。理解 Vue3 的模块化设计，能帮助我们更好地优化应用的打包体积。

## 什么是 Tree-shaking

Tree-shaking 是指打包工具在构建时，分析代码的导入导出关系，移除未被使用的代码。这个名字形象地描述了"摇动树木，让枯叶掉落"的过程。

```javascript
// math.js
export function add(a, b) { return a + b }
export function subtract(a, b) { return a - b }
export function multiply(a, b) { return a * b }

// app.js
import { add } from './math.js'
console.log(add(1, 2))

// 打包后，subtract 和 multiply 被移除
```

Tree-shaking 依赖于 ES Module 的静态结构。因为 import/export 在代码执行前就能确定依赖关系，打包工具可以进行静态分析。

## Vue2 的问题

Vue2 的 API 设计对 Tree-shaking 不友好。全局 API 都挂载在 Vue 构造函数上：

```javascript
import Vue from 'vue'

Vue.component('my-component', { /* ... */ })
Vue.directive('my-directive', { /* ... */ })
Vue.mixin({ /* ... */ })
Vue.use(plugin)
```

由于这些都是 Vue 对象的属性，打包工具无法确定哪些被使用、哪些未被使用。即使应用只用了 `Vue.component`，其他 API 的代码也会被打包进去。

另外，Vue2 的很多内置功能（如 `keep-alive`、`transition`）被编译到运行时中，即使不使用也会包含在打包结果里。

## Vue3 的模块化设计

Vue3 将代码重构为模块化结构，API 通过具名导出暴露：

```javascript
// Vue3 的导入方式
import { 
  createApp, 
  ref, 
  reactive, 
  computed,
  watch,
  onMounted 
} from 'vue'
```

未导入的功能不会被打包。如果应用不使用 `watch`，相关代码就不会出现在最终产物中。

Vue3 的源码被拆分成多个包：

```
@vue/reactivity     - 响应式系统
@vue/runtime-core   - 运行时核心
@vue/runtime-dom    - DOM 相关运行时
@vue/compiler-core  - 编译器核心
@vue/compiler-dom   - DOM 相关编译
@vue/compiler-sfc   - 单文件组件编译
```

这种拆分让不同的使用场景可以按需引入。比如，在非 DOM 环境（如小程序）中，可以只使用 `@vue/runtime-core` 配合自定义渲染器。

## 全局 API 的重构

Vue2 的全局 API 在 Vue3 中被重新设计：

```javascript
// Vue2
import Vue from 'vue'
Vue.component('MyComponent', MyComponent)
Vue.use(router)

// Vue3
import { createApp } from 'vue'
const app = createApp(App)
app.component('MyComponent', MyComponent)
app.use(router)
```

从 `Vue.xxx` 变为 `app.xxx`，这不仅让配置隔离到应用实例上（支持多应用场景），也让这些 API 可以被 Tree-shaking。

## 内置组件的按需引入

Vue3 的内置组件（`Transition`、`KeepAlive`、`Teleport`、`Suspense`）在模板中使用时，会被编译器自动导入。但如果你使用 JSX 或手写渲染函数，需要显式导入：

```javascript
import { Transition, KeepAlive } from 'vue'

export default {
  render() {
    return h(KeepAlive, null, [
      h(Transition, { name: 'fade' }, [
        // ...
      ])
    ])
  }
}
```

这种设计让不使用这些组件的应用可以节省对应的代码体积。

## 辅助函数的优化

Vue3 编译器生成的代码会使用一些辅助函数，如 `createVNode`、`openBlock`、`createTextVNode` 等。这些函数也被设计为可 Tree-shaking：

```javascript
// 编译生成的代码
import { createVNode as _createVNode, toDisplayString as _toDisplayString } from 'vue'

function render() {
  return _createVNode('div', null, _toDisplayString(msg))
}
```

只有实际使用到的辅助函数才会被导入和打包。

## 打包体积对比

根据 Vue 团队的测试数据：

| 场景 | Vue2 | Vue3 |
|------|------|------|
| 最小应用（gzip） | ~23KB | ~10KB |
| 使用 Composition API | - | ~16KB |
| 完整功能 | ~32KB | ~22KB |

对于一个只使用基础功能的应用，Vue3 的体积几乎是 Vue2 的一半。这在移动端和弱网环境下尤其重要。

## 开发者需要注意的点

为了获得最佳的 Tree-shaking 效果，开发者需要注意几点：

避免使用 `import * as Vue from 'vue'` 这种导入方式，它会导入所有导出，阻止 Tree-shaking。

使用现代打包工具（Webpack 4+、Rollup、Vite），并确保配置正确。

如果使用 TypeScript，确保 `module` 编译选项设置为 `ESNext` 或 `ES2015`，保留 ES Module 语法供打包工具分析。

这些都是 Vue3 在架构层面为开发者铺平的道路，让应用可以轻松获得更小的打包体积。
